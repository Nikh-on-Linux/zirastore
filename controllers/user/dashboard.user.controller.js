import { pool } from "../../configs/database.config.js";

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

        const { user_id } = req.body;
        const { folderName } = req.params;
        const client = await pool.connect();

        try {
            const response = await client.query(
                "SELECT * FROM"
            )
        }
        catch (err) {
            console.log(err);
            res.status(500).json({ message: "Internal server error", suc: false });
        }
        finally {
            client.release();
        }

    }

}

const dashboard = new Dashboard();
export default dashboard;

// What features should be appeared in my dashboard?
// I should be able to see, recent files (5) & (5) folders, space used out of total.