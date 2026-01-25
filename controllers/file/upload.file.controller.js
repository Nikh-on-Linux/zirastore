import busboy from "busboy";
import fs from "fs";
import os from "os";
import path from "path";
import { v7 as uuidv7 } from 'uuid';
import { pool } from "../../configs/database.config.js";

export async function uploadFile(req, res, next) {
    try {
        const objid = uuidv7();

        let newDir = path.join(os.homedir(), `zirastore/${objid.substring(0, 2)}`);

        try { fs.mkdirSync(newDir); } catch (err) { /* Directory already exists */ }
        newDir = path.join(newDir, objid.substring(2, 4));
        try { fs.mkdirSync(newDir); } catch (err) { /* Subdirectory already exists */ }

        // Database operation
        const client = await pool.connect();
        await client.query("BEGIN");

        const queries = [];
        const streamPromises = [];

        const boy = busboy({ headers: req.headers });

        boy.on('file', async(fieldname, file, info) => {
            // write file to disk

            const response = await client.query("SELECT * FROM files WHERE filename=$1 and pathname=$2",[info.filename,"/"]);

            if(response.rows.length != 0){
                res.status(409).json({message:"File already exist in current directory",suc:false});
                return;
            }


            const filepath = path.join(newDir, objid);
            const writeStream = fs.createWriteStream(filepath);
            file.pipe(writeStream);

            // wait for the stream to finish before considering the file written
            const streamDone = new Promise((resolve, reject) => {
                writeStream.on('finish', resolve);
                writeStream.on('close', resolve);
                writeStream.on('error', reject);
                file.on('error', reject);
            });
            streamPromises.push(streamDone);

            // enqueue DB insert (do not await here)
            const insertPromise = client.query(
                "INSERT INTO files(user_id, object_name, filename, mimetype, pathname, encoding) VALUES($1,$2,$3,$4,$5,$6)",
                [req.body.user_id, objid, info.filename, info.mimeType || info.mime, "/", info.encoding]
            );
            queries.push(insertPromise);

            // optional: handle per-file errors
            streamDone.catch(err => {
                console.error('File write error:', err);
            });
        });

        boy.on('finish', async () => {
            try {
                // wait for all file streams to finish
                await Promise.all(streamPromises);

                // wait for all DB inserts to complete
                await Promise.all(queries);

                await client.query("COMMIT");
                res.status(201).send('It worked');
            }
            catch (err) {
                console.error('Error during finish handling:', err);
                try { await client.query("ROLLBACK"); } catch (e) { console.error('Rollback error:', e); }
                res.status(500).send('Error');
            }
            finally {
                client.release();
            }
        });

        boy.on('error', async (err) => {
            console.error('Busboy error:', err);
            try { await client.query("ROLLBACK"); } catch (e) { console.error('Rollback error:', e); }
            client.release();
            res.status(500).send('Error');
        });

        // start parsing the request
        req.pipe(boy);
    }
    catch (err) {
        console.log(err);
        next(err);
    }
}