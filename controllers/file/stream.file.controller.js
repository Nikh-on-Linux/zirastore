import { pool } from "../../configs/database.config.js";
import { getFinalObjectPath } from "../../configs/utils/storage.util.config.js";
import fs from "fs";

class StreamFile {

    async fileInfo(req, res) {
        const { user_id } = req.body;
        const { filename } = req.params;

        const client = await pool.connect();
        try {
            const dbResponse = await client.query(
                'SELECT object_name FROM files WHERE user_id=$1 and filename=$2',
                [user_id, filename]
            )

            if (dbResponse.rowCount == 0) {
                res.status(404).json({ message: "File not found", success: false });
                return;
            }

            res.status(200).json({ message: "File found", success: true, data: { object_name: dbResponse.rows[0].object_name } })
        }
        catch (e) {
            console.log(e);
            res.status(500).json({ message: "Internal Server Error", success: false });
        }
        finally {
            client.release();
        }
    }

    async stream(req, res) {
        const { object } = req.params;
        const filePath = await getFinalObjectPath(object);
        const client = await pool.connect();
        try {
            const dbResponse = await client.query(
                "SELECT * FROM files WHERE object_name=$1",
                [object]
            )

            if (dbResponse.rowCount == 0) {
                res.status(404).json({ message: "File not found", success: false });
                return;
            }

            const range = req.headers.range;

            if (!range) {
                res.writeHead(200, {
                    "Content-Length": dbResponse.rows[0].file_size,
                    "Content-Type": dbResponse.rows[0].mimetype,
                    "Accept-Ranges": "bytes",
                    "Content-Disposition": `attachment; filename="${object}"`,
                    "Content-Name": dbResponse.rows[0].filename
                });

                fs.createReadStream(filePath).pipe(res);
                return;
            }

            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1]
                ? parseInt(parts[1], 10)
                : dbResponse.rows[0].file_size - 1;

            if (start >= dbResponse.rows[0].file_size || end >= dbResponse.rows[0].file_size) {
                return res.status(416).json({message:"Range not satisfied", success:false});
            }

            const chunkSize = end - start + 1;

            res.writeHead(206, {
                "Content-Range": `bytes ${start}-${end}/${dbResponse.rows[0].file_size}`,
                "Accept-Ranges": "bytes",
                "Content-Length": chunkSize,
                "Content-Type": "application/octet-stream",
            });

            const stream = fs.createReadStream(filePath, { start, end });
            stream.pipe(res);

            res.on('close',()=>{
                stream.destroy();
            })

            return;

        }
        catch (err) {
            console.log(err);
            res.status(500).json({ message: "Internal server error", success: false });
        }
        finally {
            await client.release();
        }


    }
}

const streamFile = new StreamFile();
export default streamFile;