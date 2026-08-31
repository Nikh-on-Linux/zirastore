import { pool } from "../../configs/database.config.js";
import { getFinalObjectPath } from "../../configs/utils/storage.util.config.js";
import { pathResolver } from "./chunkupload.file.controller.js";
import fs from "fs";

class StreamFile {

    async fileInfo(req, res) {
        const { user_id, path } = req.body;
        const { filename } = req.params;

        const folderId = await pathResolver(path || "/", user_id);

        const client = await pool.connect();
        console.log(folderId);
        try {
            const dbResponse = await client.query(
                'SELECT object_name FROM files WHERE user_id=$1 and filename=$2 and folder_id=$3',
                [user_id, filename, folderId]
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
        const { download } = req.query; // ?download=1 -> force attachment; default -> inline

        const filePath = await getFinalObjectPath(object);
        const client = await pool.connect();
        try {
            const dbResponse = await client.query(
                "SELECT * FROM files WHERE object_name=$1",
                [object]
            );

            if (dbResponse.rowCount == 0) {
                res.status(404).json({ message: "File not found", success: false });
                return;
            }

            const file = dbResponse.rows[0];
            const dispositionType = download ? "attachment" : "inline";
            const safeName = encodeURIComponent(file.filename);
            const disposition = `${dispositionType}; filename="${file.filename}"; filename*=UTF-8''${safeName}`;

            const range = req.headers.range;

            if (!range) {
                res.writeHead(200, {
                    "Content-Length": file.file_size,
                    "Content-Type": file.mimetype,
                    "Accept-Ranges": "bytes",
                    "Content-Disposition": disposition,
                });
                fs.createReadStream(filePath).pipe(res);
                return;
            }

            const parts = range.replace(/bytes=/, "").split("-");
            let start = parts[0] ? parseInt(parts[0], 10) : NaN;
            let end = parts[1] ? parseInt(parts[1], 10) : NaN;

            if (isNaN(start) && !isNaN(end)) {
                // suffix range, "bytes=-500" -> last 500 bytes
                start = Math.max(file.file_size - end, 0);
                end = file.file_size - 1;
            } else if (!isNaN(start) && isNaN(end)) {
                end = file.file_size - 1;
            }

            if (isNaN(start) || isNaN(end) || start > end || start < 0 || end >= file.file_size) {
                res.set("Content-Range", `bytes */${file.file_size}`);
                return res.status(416).json({ message: "Range not satisfiable", success: false });
            }

            const chunkSize = end - start + 1;

            res.writeHead(206, {
                "Content-Range": `bytes ${start}-${end}/${file.file_size}`,
                "Accept-Ranges": "bytes",
                "Content-Length": chunkSize,
                "Content-Type": file.mimetype,
                "Content-Disposition": disposition,
            });

            const stream = fs.createReadStream(filePath, { start, end });
            stream.pipe(res);
            res.on('close', () => stream.destroy());
        }
        catch (err) {
            console.log(err);
            res.status(500).json({ message: "Internal server error", success: false });
        }
        finally {
            client.release();
        }
    }
}

const streamFile = new StreamFile();
export default streamFile;