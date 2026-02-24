import { v7 as uuidv7 } from "uuid";
import fs from "fs";
import path from "path";
import { pool } from "../../configs/database.config.js";
import { getFinalObjectPath, getTmpUploadDir, getFileHash } from "../../configs/utils/storage.util.config.js";
import { pipeline } from "stream/promises";

export async function initiateUpload(req, res) {
    try {
        const { filename, mimetype, size, pathname, user_id } = req.body;

        if (!filename || !user_id) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const uploadId = uuidv7();

        await pool.query(
            `INSERT INTO uploads(upload_id, user_id, filename, mimetype, pathname, total_size)
             VALUES($1,$2,$3,$4,$5,$6)`,
            [uploadId, user_id, filename, mimetype, pathname || "/", size || null]
        );

        res.status(201).json({
            upload_id: uploadId
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Init failed" });
    }
}


export async function uploadPart(req, res) {
    const { uploadId, partNumber } = req.params;

    try {
        const uploadCheck = await pool.query(
            "SELECT * FROM uploads WHERE upload_id=$1",
            [uploadId]
        );

        if (uploadCheck.rows.length === 0) {
            return res.status(404).json({ message: "Upload not found" });
        }

        const tmpDir = getTmpUploadDir(uploadId);
        const partPath = path.join(tmpDir, partNumber);

        fs.writeFileSync(partPath, req.body);

        await pool.query(
            `INSERT INTO upload_parts(upload_id, part_number, size, file_path)
             VALUES($1,$2,$3,$4)
             ON CONFLICT (upload_id, part_number)
             DO UPDATE SET size=$3, file_path=$4`,
            [uploadId, partNumber, req.body.length, partPath]
        );

        await pool.query(
            `UPDATE uploads SET status='uploading' WHERE upload_id=$1`,
            [uploadId]
        );

        res.status(200).json({ message: "Part uploaded" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Part upload failed" });
    }
}

export async function completeUpload(req, res) {
    const { uploadId, uploadfilehash } = req.params;

    const client = await pool.connect();

    try {
        const uploadRes = await client.query(
            "SELECT * FROM uploads WHERE upload_id=$1",
            [uploadId]
        );

        if (uploadRes.rows.length === 0) {
            return res.status(404).json({ message: "Upload not found" });
        }

        const upload = uploadRes.rows[0];

        const partsRes = await client.query(
            "SELECT * FROM upload_parts WHERE upload_id=$1 ORDER BY part_number ASC",
            [uploadId]
        );

        if (partsRes.rows.length === 0) {
            return res.status(400).json({ message: "No parts uploaded" });
        }

        const objectId = uuidv7();
        const finalPath = getFinalObjectPath(objectId);

        const writeStream = fs.createWriteStream(finalPath);

        for (const part of partsRes.rows) {

            await new Promise((resolve, reject) => {
                const readStream = fs.createReadStream(part.file_path);

                readStream.on("error", reject);
                writeStream.on("error", reject);

                readStream.on("end", resolve);

                readStream.pipe(writeStream, { end: false });
            });
        }


        writeStream.end();

        await new Promise((resolve, reject) => {
            writeStream.on("finish", resolve);
            writeStream.on("error", reject);
        });

        // Generate uploaded file hash
        const fileHash = await getFileHash(objectId);
        console.log(fileHash);

        if (fileHash != uploadfilehash) {
            res.status(500).json({ message: "File corrupted during uploading.", suc: false });
            return;
        }

        await client.query("BEGIN");

        await client.query(
            `INSERT INTO files(user_id, object_name, filename, mimetype, pathname, file_size)
             VALUES($1,$2,$3,$4,$5,$6)`,
            [
                upload.user_id,
                objectId,
                upload.filename,
                upload.mimetype,
                upload.pathname,
                partsRes.rows.reduce((sum, p) => sum + Number(p.size), 0)
            ]
        );

        await client.query(
            `UPDATE uploads SET status='completed' WHERE upload_id=$1`,
            [uploadId]
        );

        await client.query("COMMIT");

        // cleanup temp directory
        fs.rmSync(getTmpUploadDir(uploadId), { recursive: true, force: true });

        res.status(200).json({
            message: "Upload completed",
            object_id: objectId
        });

    } catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        res.status(500).json({ message: "Complete failed" });
    } finally {
        client.release();
    }
}