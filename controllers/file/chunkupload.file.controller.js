import { v7 as uuidv7 } from "uuid";
import fsPromise from "fs/promises";
import fs from "fs";
import path from "path";
import { pool } from "../../configs/database.config.js";
import { getFinalObjectPath, getTmpUploadDir, getFileHash } from "../../configs/utils/storage.util.config.js";
import { pipeline } from "stream/promises";

async function pathResolver(pathname, user_id) {
    if (pathname === "/") {
        const root = await pool.query(
            `SELECT folder_id 
                 FROM folders 
                 WHERE user_id=$1 AND is_root=true`,
            [user_id]
        );

        if (root.rowCount === 0) {
            throw new Error("Root folder missing");
        }

        const folderId = root.rows[0].folder_id;
        return folderId;

    } else {
        // Parse pathname into segments and resolve using recursive CTE
        const pathSegments = pathname.split('/').filter(seg => seg.length > 0);

        if (pathSegments.length === 0) {
            throw new Error("Invalid path");
        }

        const result = await pool.query(
            `WITH RECURSIVE path_traversal AS (
                -- Base case: start from root folder
                SELECT 
                    folder_id,
                    folder_name,
                    0 AS depth,
                    $1::text[] AS path_segments,
                    ARRAY[folder_name]::text[] AS traversed_path
                FROM folders
                WHERE user_id = $2 AND is_root = true

                UNION ALL

                -- Recursive case: find child folders matching path segments
                SELECT 
                    f.folder_id,
                    f.folder_name,
                    pt.depth + 1,
                    pt.path_segments,
                    (pt.traversed_path || ARRAY[f.folder_name]::text[])::text[] AS traversed_path
                FROM path_traversal pt
                JOIN folders f ON f.parent_id = pt.folder_id
                                WHERE f.user_id = $2
                  AND f.folder_name = pt.path_segments[pt.depth + 1]
                  AND pt.depth < array_length(pt.path_segments, 1)
            )
            SELECT folder_id
            FROM path_traversal
            WHERE depth = array_length($1::text[], 1)
            LIMIT 1`,
            [pathSegments, user_id]
        );

        if (result.rowCount === 0) {
            throw new Error("Path not found");
        }

        return result.rows[0].folder_id;
    }
}

export { pathResolver };

export async function initiateUpload(req, res) {
    try {
        const { filename, mimetype, size, pathname, totalChunks, chunkSize, context } = req.body;

        if (context.type == "agent" && !context.scopes.includes("w")) {
            res.status(403).json({ message: "Forbidden key: Insufficient access rights", suc: false });
            return;
        }

        if (!filename || !context.user_id) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const uploadId = uuidv7();
        const user_id = context.user_id;

        const folder_id = await pathResolver(pathname, user_id);

        await pool.query(
            `INSERT INTO uploads(
                upload_id, 
                user_id, 
                folder_id,
                filename, 
                mimetype, 
                total_size,
                chunk_size,
                total_chunks,
                recieved_chunks
            )
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,0)`,
            [uploadId, user_id, folder_id, filename, mimetype, size || null, chunkSize, totalChunks]
        );

        res.status(201).json({ upload_id: uploadId, suc: true, message: "Initiation Successful" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Init failed", suc: false });
    }
}

export async function chunkStatus(req, res) {
    const { context } = req.body;
    const { uploadId } = req.params;
    try {
        if (context.type == "agent" && !context.scopes.includes("r")) {
            res.status(403).json({ message: "Forbidden key: Insufficient access rights", suc: false });
            return;
        }

        if (!context.user_id || !uploadId) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const fetchInfo = await pool.query(
            `SELECT * FROM upload_parts WHERE upload_id=$1`,
            [uploadId]
        )

        if (fetchInfo.rowCount == 0) {
            res.status(404).json({ message: "Upload information not found", suc: false });
            return
        }

        res.status(200).json({
            message: "Chunk information fetched successfully",
            suc: true,
            data: fetchInfo.rows
        })
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error", suc: false });
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
        console.log(uploadCheck.rows[0]["chunk_size"], req.body.length)
        if (uploadCheck.rows[0]["chunk_size"] < req.body.length) {
            return res.status(401).json({ message: "Forbidden chunk size", suc: false });
        }

        const tmpDir = getTmpUploadDir(uploadId);
        const partPath = path.join(tmpDir, partNumber);

        fs.writeFileSync(partPath, req.body);

        await pool.query("BEGIN");

        await pool.query(
            `INSERT INTO upload_parts(upload_id, part_number, size, file_path)
             VALUES($1,$2,$3,$4)
             ON CONFLICT (upload_id, part_number)
             DO UPDATE SET size=$3, file_path=$4`,
            [uploadId, partNumber, req.body.length, partPath]
        );


        await pool.query(
            `UPDATE uploads SET status='uploading', recieved_chunks=recieved_chunks + 1 WHERE upload_id=$1`,
            [uploadId]
        );

        await pool.query("COMMIT");

        res.status(200).json({ message: "Part uploaded", suc: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Part upload failed", suc: false });
        await pool.query("ROLLBACK");
    }
}

export async function deleteUpload() {
    const { context } = req.body;
    const { uploadId } = req.params;
    try {
        if (context.type == "agent" && !context.scopes.includes("w")) {
            res.status(403).json({ message: "Forbidden key: Insufficient access rights", suc: false });
            return;
        }

        if (!context.user_id || !uploadId) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        await pool.query("BEGIN");

        const partsInfo = await pool.query(`SELECT * FROM upload_parts WHERE upload_id=$1`, [uploadId]);

        if (partsInfo.rowCount == 0) {
            res.status(404).json({ message: "Upload information not found", suc: false });
            return;
        }

        const partId = [...partsInfo.rows];

        partId.forEach(async (part) => {
            await fsPromise.unlink(part.file_path);
        })

        await pool.query(`DELETE FROM upload_parts WHERE upload_id=$1 `, [uploadId]);

        await pool.query("COMMIT");

        res.status(200).json({ message: "Upload cancellation successful", suc: true });

    }
    catch (err) {
        await pool.query("ROLLBACK");
        console.log(err);
        res.status(500).json({ message: "Internal Server Erorr", suc: false });
    }
}

export async function uploadStatus(req, res) {
    const { context } = req.body;
    const { status } = req.params;
    try {
        if (context.type == "agent" && !context.scopes.includes("r")) {
            res.status(403).json({ message: "Forbidden key: Insufficient access rights", suc: false });
            return;
        }

        if (!context.user_id || !status) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const fetchInfo = await pool.query(
            `SELECT * FROM uploads WHERE user_id=$1 and status=$2`,
            [context.user_id, status]
        )

        if (fetchInfo.rowCount == 0) {
            res.status(404).json({ message: "Upload information not found", suc: false });
            return
        }

        const sanitizedInfo = fetchInfo.rows.map(({ user_id, ...rest }) => rest);

        console.log(sanitizedInfo);

        res.status(200).json({
            message: "Upload information fetched successfully",
            suc: true,
            data: sanitizedInfo
        })
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error", suc: false });
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
            return res.status(404).json({ message: "Upload not found", suc: false });
        }

        const upload = uploadRes.rows[0];
        const pathname = upload.folder_id;

        const partsRes = await client.query(
            "SELECT * FROM upload_parts WHERE upload_id=$1 ORDER BY part_number ASC",
            [uploadId]
        );

        if (partsRes.rows.length === 0) {
            return res.status(400).json({ message: "No parts uploaded", suc: false });
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

        // const folder_id = await pathResolver(uploadRes.rows[0].folder_id, upload.user_id);

        await client.query("BEGIN");

        await client.query(
            `INSERT INTO files(user_id, object_name, filename, mimetype, folder_id, file_size)
             VALUES($1,$2,$3,$4,$5,$6)`,
            [
                upload.user_id,
                objectId,
                upload.filename,
                upload.mimetype,
                uploadRes.rows[0].folder_id,
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
            object_id: objectId,
            suc: true
        });

    } catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        res.status(500).json({ message: "Complete failed", suc: false });
    } finally {
        client.release();
    }
}