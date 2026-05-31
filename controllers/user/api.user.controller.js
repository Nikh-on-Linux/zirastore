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
            const sourceId = await pathResolver(sourcePath, user_id );
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

}

const userControlls = new UserControlls();
export default userControlls;
