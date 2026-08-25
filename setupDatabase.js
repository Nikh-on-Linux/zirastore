import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./configs/database.config.js";
import { generateApiKey } from "./configs/utils/apikey.util.config.js";
import { pathResolver } from "./controllers/file/chunkupload.file.controller.js";
import { v4 as uuidv4 } from "uuid";
import { configDotenv } from "dotenv";
import bcrypt from "bcryptjs";
configDotenv()
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modelsDir = path.join(__dirname, "models");

// Define the execution order based on dependencies
const executionOrder = [
    "agents.model.sql",      // No dependencies
    "user.model.sql",       // Depends on: agents
    "keys.model.sql",        // Depends on: agents
    "folder.model.sql",      // Depends on: users
    "file.model.sql",        // Depends on: users, folders
    "uploads.model.sql",      // Depends on: users, folders
    "agents.modification.model.sql" // Inserts a column
];

async function executeModelFile(filename) {
    try {
        const filepath = path.join(modelsDir, filename);

        // Check if file exists
        if (!fs.existsSync(filepath)) {
            throw new Error(`Model file not found: ${filename}`);
        }

        // Read SQL content
        const sqlContent = fs.readFileSync(filepath, "utf-8");

        // Execute the SQL
        await pool.query(sqlContent);
        console.log(`✓ Successfully executed: ${filename}`);

        return true;
    } catch (err) {
        console.error(`✗ Error executing ${filename}:`, err.message);
        throw err;
    }
}

async function setupDatabase() {
    console.log("\n  Starting database setup...\n");

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        for (const modelFile of executionOrder) {
            console.log(` Processing: ${modelFile}`);
            const filepath = path.join(modelsDir, modelFile);

            if (!fs.existsSync(filepath)) {
                throw new Error(`Model file not found: ${filepath}`);
            }

            const sqlContent = fs.readFileSync(filepath, "utf-8");
            await client.query(sqlContent);
            console.log(`  Completed\n`);
        }

        console.log("Tables are created successfully");

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(process.env.ROOT_PASSWORD, salt);

        const insertRootUser = await client.query(
            `INSERT INTO users(name, email, password, provider) VALUES($1, $2, $3, $4) RETURNING user_id`,
            [process.env.ROOT_NAME, process.env.ROOT_EMAIL, hash, "system"]
        )

        console.log("Root user created successfully");

        const rootFolderId = await uuidv4();
        
        const initializeFolder = await client.query(
            "INSERT INTO folders (folder_id, user_id, parent_id, folder_name, is_root) VALUES($1, $2, $1, 'root', true) RETURNING folder_id",
            [rootFolderId, insertRootUser.rows[0].user_id]
        )

        const apikey = await generateApiKey();

        const insertAgent = await client.query(
            `INSERT INTO agents(name, scopes, path, target_folder, created_by) VALUES($1, $2, $3, $4, $5) RETURNING *`,
            ["root_agent", "rwx", "/", initializeFolder.rows[0].folder_id, insertRootUser.rows[0].user_id]
        );

        if (insertAgent.rowCount == 0) {
            throw new Error("Failed to create root agent");
        }

        const agent_id = insertAgent.rows[0].agent_id;

        const insertApi = await client.query(
            `INSERT INTO keys(agent_id, key_id, secret_hash) VALUES($1, $2, $3) RETURNING *`,
            [agent_id, apikey.keyId, apikey.secretHash]
        );

        if (insertApi.rowCount == 0) {
            throw new Error("Failed to create API key");
        }

        await client.query("COMMIT");

        console.log("Database setup completed successfully!");
        console.log(" Root Agent API Key (store this securely, it won't be shown again):");
        console.log(apikey.fullKey);

        process.exit(0);

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("\n Database setup failed. All changes rolled back.");
        console.error("Error:", err.message);
        process.exit(1);

    } finally {
        client.release();
    }
}

// Run setup
setupDatabase();
