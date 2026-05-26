import { pool } from "../../configs/database.config.js";
import { pathResolver } from "../file/chunkupload.file.controller.js";

class Dashboard {

    async recentFiles(req, res) {
        const { user_id } = req.body;
        const client = await pool.connect();
        try {
            const response = await client.query(
                'SELECT * FROM files WHERE user_id=$1 ORDER BY file_id DESC LIMIT 10',
                [user_id]
            )

            if (response.rowCount == 0) {
                res.status(404).json({ message: "Files not found by the user", suc: false });
                return;
            }

            const data = [];

            response.rows.forEach((item) => {
                data.push({
                    filename: item.filename,
                    mimetype: item.mimetype,
                    encoding: item.encoding,
                    file_size: item.file_size,
                    pathname: item.pathname
                })
            })

            res.status(200).json({ message: "Fetched recent files", suc: true, data: data })
        }

        catch (err) {
            console.log(err);
            res.status(500).json({ message: "Internal server error", suc: false });
        }

        finally {
            client.release();
        }

    }

    // Create a new folder

    async createFolder(req, res) {

        const { user_id, path, agent } = req.body;
        const { folderName } = req.params;
        const client = await pool.connect();
        console.log(user_id);

        try {
            // Resolve the path to get parent folder ID
            let parentId;
            try {
                parentId = await pathResolver(path || "/", user_id || agent.agent_id);
            } catch (err) {
                res.status(404).json({ message: err.message, suc: false });
                return;
            }

            // Check if folder with the same name already exists in the parent directory
            const existingFolder = await client.query(
                'SELECT folder_id FROM folders WHERE user_id=$1 AND parent_id=$2 AND folder_name=$3',
                [user_id, parentId, folderName]
            );

            if (existingFolder.rowCount > 0) {
                res.status(409).json({ message: "Folder with this name already exists", suc: false });
                return;
            }

            // Create the new folder
            const response = await client.query(
                'INSERT INTO folders (user_id, agent_id, parent_id, folder_name, is_root) VALUES ($1, $2, $3, $4, false) RETURNING folder_id, folder_name, created_at',
                [user_id,agent?.agent_id, parentId, folderName]
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
        const { user_id, sourcePath, destinationPath } = req.body;
        const client = await pool.connect();
        try {

            const folderId = await pathResolver(sourcePath, user_id);
            const destinationId = await pathResolver(destinationPath, user_id);

            await client.query("BEGIN");

            await client.query(`UPDATE folders SET parent_id = $1 WHERE user_id=$3 and folder_id = $2`,
                [destinationId, folderId, user_id]);

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

}

const dashboard = new Dashboard();
export default dashboard;

// What features should be appeared in my dashboard?
// I should be able to see, recent files (5) & (5) folders, space used out of total.