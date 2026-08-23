import { pool } from "../../configs/database.config.js";
import { pathResolver } from "../../controllers/file/chunkupload.file.controller.js";
import bcrypt from "bcryptjs";
class Dashboard {

    async userInfo(req, res) {
        const { context } = req.body;

        if (context.type == "agent") {
            res.status(403).json({ message: "Forbidden key: Restricted access for agents.", suc: false });
            return;
        }
        const client = await pool.connect();
        try {
            const userResponse = await client.query(
                `SELECT name, email, image FROM users WHERE user_id=$1`,
                [context.user_id]
            );

            if (userResponse.rowCount == 0) {
                res.status(404).json({ message: "User not found", suc: false });
                return;
            }

            res.status(200).json({
                message: "Successfully fetched user data",
                suc: true,
                data: {
                    name: userResponse.rows[0].name,
                    email: userResponse.rows[0].email,
                    image: userResponse.rows[0].image,
                }
            });
        }
        catch (error) {
            res.status(500).json({ message: `Internal server error: ${error.message}`, suc: false });
        }
        finally {
            await client.release();
        }
    }

    async editUser(req, res) {
        const { context, name, email } = req.body;

        if (context.type == "agent") {
            res.status(403).json({ message: "Forbidden key: Restricted access for agents.", suc: false })
            return;
        }

        const client = await pool.connect();
        try {
            const user = await client.query(`SELECT user_id FROM users WHERE user_id=$1`, [context.user_id]);
            if (user.rowCount == 0) {
                res.status(404).json({ message: "User not found", suc: false });
                return;
            }

            await client.query("BEGIN");

            await client.query(
                `UPDATE users SET name=$1, email=$2 WHERE user_id=$3`,
                [name, email, context.user_id]
            );

            await client.query("COMMIT");

            res.status(200).json({ message: "User information updated successfully", suc: true });
        }
        catch (error) {
            res.status(500).json({ message: `Internal server error: ${error.message}`, suc: false });
            await client.query("ROLLBACK");
        }
        finally {
            await client.release();
        }
    }

    async updatePassword(req, res) {
        const { context, name, email, oldPassword, newPassword, hashPassword } = req.body;

        if (context.type == "agent") {
            res.status(403).json({ message: "Forbidden key: Restricted access for agents.", suc: false })
            return;
        }

        const client = await pool.connect();
        try {
            const user = await client.query(`SELECT user_id, password FROM users WHERE user_id=$1`, [context.user_id]);
            if (user.rowCount == 0) {
                res.status(404).json({ message: "User not found", suc: false });
                return;
            }

            const passwordMatched = await bcrypt.compare(oldPassword, user.rows[0].password);

            if (!passwordMatched) {
                res.status(403).json({ message: "Invalid password", suc: false });
                return;
            }

            await client.query("BEGIN");

            await client.query(
                `UPDATE users SET password=$1 WHERE user_id=$2`,
                [hashPassword, context.user_id]
            );

            await client.query("COMMIT");
            res.status(200).json({ message: "Password reset successful", suc: true });
        }
        catch (error) {
            res.status(500).json({ message: `Internal server error: ${error.message}`, suc: false });
            await client.query("ROLLBACK");
        }
        finally {
            await client.release();
        }
    }

    async recentFiles(req, res) {
        const { context } = req.body;

        if (context.type == "agent" && !context.scopes.includes("r")) {
            res.status(403).json({ message: "Forbidden key: Insufficient access rights", suc: false });
            return;
        }

        const client = await pool.connect();
        try {
            const response = await client.query(
                'SELECT * FROM files WHERE user_id=$1 ORDER BY file_id DESC LIMIT 10',
                [context.user_id]
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

    async showAgents(req, res) {
        const { context } = req.body;

        if (context.type == "agent" && !context.scopes.includes("r")) {
            res.status(403).json({ message: "Forbidden key: Insufficient access rights.", suc: false });
            return;
        }

        const user_id = context.user_id;
        const client = await pool.connect();
        try {
            const response = await client.query(
                `SELECT agent_id, name, scopes, path FROM agents WHERE created_by=$1 ORDER BY name ASC`,
                [user_id]
            )

            if (response.rowCount == 0) {
                res.status(404).json({ message: "Agents not found", suc: false });
            }

            res.status(200).json({
                message: "Agents fetched successfully",
                suc: true,
                data: response.rows
            })
        }
        catch (error) {
            res.status(500).json({ message: `Internal server error: ${error.message}`, suc: false });
        }
        finally {
            await client.release();
        }
    }

    async showDirectory(req, res) {
        const { context, path } = req.body;

        if (context.type == "agent" && !context.scopes?.includes("r")) {
            res.status(403).json({ message: "Forbidden key: Insufficient access rights" });
            return;
        }

        const client = await pool.connect();
        try {
            const folderId = await pathResolver(path,context.user_id);

            const folders = await client.query(
                `SELECT folder_id, folder_name, created_at FROM folders WHERE parent_id=$1 and user_id=$2 and is_root!=true ORDER BY folder_name ASC`,
                [folderId,context.user_id]
            );

            const files = await client.query(
                `SELECT filename, file_id, mimetype, encoding, file_size, created_at FROM files WHERE user_id=$1 and folder_id=$2 ORDER BY filename ASC`,
                [context.user_id,folderId]
            )

            res.status(200).json(
                {
                    message:"Directory fetched successfully",
                    suc:true,
                    data:{
                        folders: folders.rows,
                        files: files.rows
                    }
                }
            )
        }
        catch(error){
            res.status(500).json({message:`Internal server error:${error.message}`,suc:false});
        }
        finally{
            await client.release();
        }
    }

}

const dashboard = new Dashboard();
export default dashboard;

// What features should be appeared in my dashboard?
// I should be able to see, recent files (5) & (5) folders, space used out of total.