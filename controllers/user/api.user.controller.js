import { pool } from "../../configs/database.config.js";
import { pathResolver } from "../file/chunkupload.file.controller.js";

class UserControlls {

    async createFolder(req, res) {

        const { path, context } = req.body;
        const { folderName } = req.params;

        if (context.type == "agent" && !context.scopes.includes("w")) {
            res.status(403).json({ message: "Forbidden key: Insufficient access rights", suc: false });
            return;
        }

        const client = await pool.connect();

        try {
            let parentId;
            try {
                parentId = await pathResolver(path || "/", context.user_id);
            } catch (err) {
                res.status(404).json({ message: err.message, suc: false });
                return;
            }

            const existingFolder = await client.query(
                'SELECT folder_id FROM folders WHERE user_id=$1 AND parent_id=$2 AND folder_name=$3',
                [context.user_id, parentId, folderName]
            );

            if (existingFolder.rowCount > 0) {
                res.status(409).json({ message: "Folder with this name already exists", suc: false });
                return;
            }

            const response = await client.query(
                'INSERT INTO folders (user_id, agent_id, parent_id, folder_name, is_root) VALUES ($1, $2, $3, $4, false) RETURNING folder_id, folder_name, created_at',
                [context.user_id, null, parentId, folderName]
            );

            const folderData = response.rows[0];
            res.status(201).json({
                message: "Folder created successfully",
                suc: true,
                data: {
                    folder_id: folderData.folder_id,
                    folder_name: folderData.folder_name,
                    created_at: folderData.created_at
                }
            });
        }
        catch (err) {
            console.log(err);
            res.status(500).json({ message: "Internal server error", suc: false });
        }
        finally {
            client.release();
        }

    }

    async moveFolder(req, res) {
        const { sourcePath, destinationPath, context } = req.body;

        if (context.type == "agent" && !context.scopes.includes("w")) {
            res.status(403).json({ message: "Forbidden key: Insufficient access rights", suc: false });
            return;
        }

        const client = await pool.connect();
        try {

            const folderId = await pathResolver(sourcePath, context.user_id);
            const destinationId = await pathResolver(destinationPath, context.user_id);

            await client.query("BEGIN");

            await client.query(`UPDATE folders SET parent_id = $1 WHERE user_id=$3 and folder_id = $2`,
                [destinationId, folderId, context.user_id]);

            await client.query("COMMIT");

            res.status(200).json({ message: "Folder moved successfully", suc: true });
        }
        catch (error) {
            await client.query("ROLLBACK");
            res.status(500).json({ message: error.message, suc: false });
        }
        finally {
            await client.release();
        }
    }

    async moveFile(req, res) {
        const { context, sourcePath, destinationPath } = req.body;
        const { filename } = req.params;

        if (context.type == "agent" && !context.scopes.includes("w")) {
            res.status(403).json({ message: "Forbidden key: Insufficient access rights", suc: false });
            return;
        }

        const user_id = context?.user_id;

        const client = await pool.connect();

        try {
            const sourceId = await pathResolver(sourcePath, user_id);
            const destinationId = await pathResolver(destinationPath, user_id);

            const fileExist = await client.query(
                `SELECT file_id FROM files WHERE user_id=$1 and folder_id=$2 and filename=$3 `,
                [user_id, sourceId, filename]
            )

            if (fileExist.rowCount == 0) {
                res.status(404).json({ message: "File not found in the provided path", suc: false });
                return;
            }

            await client.query("BEGIN");

            await client.query(
                `UPDATE files SET folder_id=$1 WHERE file_id=$2`,
                [destinationId, fileExist?.rows[0].file_id]
            )

            await client.query("COMMIT");

            res.status(200).json({ message: "File moved in the target folder", suc: true });
        }
        catch (error) {
            res.status(500).json({ message: `Internal server error: ${error.message}`, suc: false });
            await client.query("ROLLBACK");
        }
        finally {
            await client.release();
        }

    }

    async renameFile(req, res, next) {
        const { context, sourcePath, newName } = req.body;
        const { filename } = req.params;

        if (context.type == "agent" && !context.scopes.includes("w")) {
            res.status(403).json({ message: "Forbidden key: Insufficient access rights", suc: false });
            return;
        }

        const user_id = context.user_id;

        if (!filename) {
            res.status(401).json({ message: "Invalid input query", suc: false });
            return;
        }

        const client = await pool.connect();

        try {
            const folderId = await pathResolver(sourcePath, user_id);

            const fileId = await client.query(
                `SELECT file_id FROM files WHERE user_id=$1 and folder_id=$2 and filename=$3`,
                [user_id, folderId, filename]
            )

            if (fileId.rowCount == 0) {
                res.status(404).json({ message: "File doesnot exist.", suc: false });
                return;
            }

            await client.query("BEGIN");
            await client.query(
                `UPDATE files SET filename=$1 WHERE file_id=$2`,
                [newName, fileId?.rows[0].file_id]
            );

            await client.query("COMMIT");

            res.status(200).json({ message: "File reanmed successfully", suc: true });
        }
        catch (error) {
            await client.query("ROLLBACK");
            res.status(500).json({ message: `Internal server error: ${error.message}`, suc: false });

        }
        finally {
            await client.release();
        }

    }

    async renameFolder(req, res, next) {
        const { context, sourcePath, newName } = req.body;

        if (context.type == "agent" && !context.scopes.includes("w")) {
            res.status(403).json({ message: "Forbidden key: Insufficient access rights", suc: false });
            return;
        }

        const user_id = context.user_id;

        const client = await pool.connect();

        try {
            const folderId = await pathResolver(sourcePath, user_id);

            await client.query("BEGIN");
            await client.query(
                `UPDATE folders SET folder_name=$1 WHERE user_id=$2 and folder_id=$3`,
                [newName, user_id, folderId]
            )

            await client.query("COMMIT");
            res.status(200).json({ message: "Folder renamed successfully.", suc: true });
        }
        catch (error) {
            await client.query("ROLLBACK");
            res.status(500).json({ message: `Internal server error: ${error.message}`, suc: false });

        }
        finally {
            await client.release();
        }
    }

    async editAgent(req, res) {
        const { context, name, scopes, path, webhook } = req.body;
        const { id } = req.params;

        if (context.type == "agent") {
            res.status(403).json({ message: "Forbidden key: Insufficient access rights. Agents are not allowed.", suc: false });
            return;
        }
        const client = await pool.connect();

        try {
            // Fetch agent WITH webhook subscription in a single query
            const agentResult = await client.query(
                `SELECT 
                a.agent_id,
                a.name,
                a.scopes,
                a.path,
                a.target_folder,
                a.created_by,
                w.id as webhook_id,
                w.target_url,
                w.enabled as webhook_enabled,
                w.event_type,
                w.target_folder as webhook_target_folder
             FROM agents a
             LEFT JOIN webhook_subscriptions w ON a.agent_id = w.agent_id
             WHERE a.agent_id = $1`,
                [id]
            );

            if (agentResult.rowCount == 0) {
                res.status(404).json({ message: "Agent not found", suc: false });
                return;
            }

            const agentData = agentResult.rows[0];

            // Check if user owns this agent
            if (agentData.created_by !== context.user_id) {
                res.status(403).json({ message: "You don't have permission to edit this agent", suc: false });
                return;
            }

            // Check if name already exists for another agent
            if (name !== agentData.name) {
                const existingAgent = await client.query(
                    `SELECT agent_id FROM agents WHERE name=$1 AND created_by=$2 AND agent_id != $3`,
                    [name, context.user_id, id]
                );
                if (existingAgent.rowCount > 0) {
                    res.status(409).json({
                        message: "An agent with this name already exists",
                        suc: false
                    });
                    return;
                }
            }

            await client.query("BEGIN");

            let folderId = agentData.target_folder;
            let pathChanged = false;

            // Update path if changed
            if (path != agentData.path) {
                folderId = await pathResolver(path, context.user_id);
                pathChanged = true;

                await client.query(
                    `UPDATE agents SET name=$1, scopes=$2, path=$3, target_folder=$4 WHERE created_by=$5 AND agent_id=$6`,
                    [name, scopes, path, folderId, context.user_id, id]
                );
            } else {
                await client.query(
                    `UPDATE agents SET name=$1, scopes=$2 WHERE created_by=$3 AND agent_id=$4`,
                    [name, scopes, context.user_id, id]
                );
            }

            // Handle webhook subscription based on conditions
            const hasWebhookData = webhook && webhook.target_url && webhook.target_url.trim() !== '';
            const existingWebhookId = agentData.webhook_id;

            if (hasWebhookData) {
                // Case 1: Webhook data provided with valid target_url - Create or Update
                const eventType = webhook.event_type || agentData.event_type || 'file.uploaded';
                const enabled = webhook.enabled !== undefined ? webhook.enabled : true;

                if (existingWebhookId) {
                    // Update existing webhook
                    await client.query(
                        `UPDATE webhook_subscriptions 
                     SET target_url = $1, 
                         target_folder = $2, 
                         event_type = $3, 
                         enabled = $4
                     WHERE agent_id = $5`,
                        [webhook.target_url.trim(), folderId, eventType, enabled, id]
                    );
                } else {
                    // Create new webhook subscription
                    await client.query(
                        `INSERT INTO webhook_subscriptions 
                     (agent_id, user_id, target_folder, event_type, target_url, enabled) 
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                        [id, context.user_id, folderId, eventType, webhook.target_url.trim(), enabled]
                    );
                }
            } else if (existingWebhookId) {
                // Case 2: No valid webhook data but webhook exists - Delete it
                await client.query(
                    `DELETE FROM webhook_subscriptions WHERE agent_id = $1`,
                    [id]
                );
            }
            // Case 3: No valid webhook data and no webhook exists - Do nothing

            await client.query("COMMIT");

            // Fetch updated agent with webhook details for response
            const updatedAgent = await client.query(
                `SELECT 
                a.agent_id, 
                a.name, 
                a.scopes, 
                a.path,
                json_build_object(
                    'target_url', w.target_url,
                    'enabled', w.enabled,
                    'event_type', w.event_type
                ) AS webhook
             FROM agents a
             LEFT JOIN webhook_subscriptions w ON a.agent_id = w.agent_id
             WHERE a.agent_id = $1`,
                [id]
            );

            res.status(200).json({
                message: "Agent configurations updated successfully",
                suc: true,
                data: updatedAgent.rows[0]
            });
            return;
        }
        catch (error) {
            console.log(error);
            res.status(500).json({ message: `Internal server error: ${error.message}`, suc: false });
            await client.query("ROLLBACK");
        }
        finally {
            await client.release();
        }
    }

    async deleteAgent(req, res) {
        const { context } = req.body;
        const { id } = req.params;

        if (context.type == "agent") {
            res.status(403).json({ message: "Forbidden key: Agents don't have enough access rights", suc: false });
            return;
        }

        const client = await pool.connect();

        try {

            const agent = await client.query(
                `SELECT agent_id FROM agents WHERE created_by=$1 and agent_id=$2`,
                [context.user_id, id]
            );

            if (agent.rowCount == 0) {
                res.status(404).json({ message: "Agent not found", suc: false });
                return;
            }

            const agentId = agent.rows[0].agent_id;

            await client.query("BEGIN");

            await client.query(
                `DELETE FROM keys WHERE agent_id=$1`,
                [agentId]
            );

            await client.query(
                `DELETE FROM agents WHERE agent_id=$1`,
                [agentId]
            );

            await client.query(
                `DELETE FROM webhook_subscriptions WHERE agent_id=$1`,
                [agentId]
            )

            await client.query("COMMIT");
            res.status(200).json({ message: "Agent deleted successfully", suc: true });
        }
        catch (error) {
            await client.query("ROLLBACK");
            switch (error.code) {
                case '23503':
                    res.status(409).json({ message: "Cannot delete agent: referenced by other records", suc: false });
                    break;
                case '23505':
                    res.status(409).json({ message: "Unique constraint violation", suc: false });
                    break;
                case '42703':
                    res.status(500).json({ message: "Database column not found", suc: false });
                    break;
                case '08006':
                    res.status(503).json({ message: "Database connection lost", suc: false });
                    break;
                case 'ECONNREFUSED':
                    res.status(503).json({ message: "Cannot connect to database", suc: false });
                    break;
                case 'ETIMEDOUT':
                    res.status(504).json({ message: "Database connection timeout", suc: false });
                    break;
                default:
                    res.status(500).json({ message: `Internal server error: ${error.message}`, suc: false });
            }
        }
        finally {
            client.release();
        }
    }

}

const userControlls = new UserControlls();
export default userControlls;
