import { pool } from "../../configs/database.config.js";
import { v4 as uuidv4 } from "uuid";
import { generateApiKey } from "../../configs/utils/apikey.util.config.js";

class Register {

    async email(req, res, next) {
        const { name, email, hashPassword, image, agent } = req.body;

        if(agent.scopes != "rwx"){
            res.status(403).json({message:"Access denied, permission not granted", success:false});
            return;
        }
        const client = await pool.connect();

        try {

            var result;
            if (!agent_id) {
                result = await client.query(
                    "INSERT INTO users(name,email,password,provider,image) VALUES($1,$2,$3,$4,$5) RETURNING *",
                    [name, email, hashPassword, "email", image]
                );
            }
            else {
                result = await client.query(
                    "INSERT INTO users(name,email,password,provider,image,agent_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
                    [name, email, hashPassword, "email", image, agent.agent_id]
                );
            }


            const rootFolderId = await uuidv4();

            const initialize = await client.query(
                "INSERT INTO folders (folder_id, user_id, parent_id, folder_name, is_root) VALUES($1, $2, $1, 'root', true) RETURNING *",
                [rootFolderId, result.rows[0].user_id]
            )

            if (initialize.rowCount == 0) {
                res.status(500).json({ message: "Initialization failed", success: false });
                return;
            }

            res.status(201).json({ success: true, user: result.rows[0] });
        } catch (err) {
            console.log(err);
            if (err.code == "23505") {
                res.status(409).json({ message: "User already exist", success: false });
                return;
            }
            res.status(500).json({ message: "Internal server error", success: false });
        } finally {
            client.release();
        }
    }

    // TODO: Google provider & Microsoft Provider

    async agent(req, res, next) {
        const { name, target_folder, scopes, user_id } = req.body;
        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            const result = await client.query(
                "INSERT INTO agents(name, created_by, scopes, target_folder) VALUES($1, $2, $3, $4) RETURNING *",
                [name, user_id, scopes, target_folder]
            );

            if (result.rowCount == 0) {
                await client.query("ROLLBACK");
                res.status(500).json({ message: "Failed to register agent", success: false });
                return;
            }

            const apikey = generateApiKey();
            const agent_id = result.rows[0].agent_id;

            const insertApi = await client.query(
                `INSERT INTO keys(agent_id, key_id, secret_hash) VALUES($1, $2, $3) RETURNING *`,
                [agent_id, apikey.keyId, apikey.secretHash]
            );

            if (insertApi.rowCount == 0) {
                await client.query("ROLLBACK");
                res.status(500).json({ message: "Failed to generate API key", success: false });
                return;
            }

            await client.query("COMMIT");

            res.status(201).json({ success: true, agent: result.rows[0], apiKey: apikey.fullKey });
        } catch (err) {
            await client.query("ROLLBACK");

            switch (err.code) {
                case "23505": // unique_violation
                    res.status(409).json({ message: "Agent already exists", success: false });
                    break;

                case "23503": // foreign_key_violation (e.g. invalid user_id)
                    res.status(400).json({ message: "Referenced user does not exist", success: false });
                    break;

                case "23502": // not_null_violation
                    res.status(400).json({ message: `Missing required field: ${err.column}`, success: false });
                    break;

                case "23514": // check_violation
                    res.status(400).json({ message: "Invalid value for a field", success: false });
                    break;

                default:
                    console.error(err);
                    res.status(500).json({ message: "Internal server error", success: false });
                    break;
            }
        } finally {
            client.release();
        }
    }
}

export default Register;