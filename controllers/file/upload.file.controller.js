import busboy from "busboy";
import fs from "fs";

export async function uploadFile(req, res, next) {
    try {
        const boy = busboy({ headers: req.headers });
        boy.on('file', (name, file, info) => {
            const writeStream = fs.createWriteStream(info.filename);
            file.pipe(writeStream);
        })
        boy.on('finish', () => {
            res.send('It worked');
        })
        boy.on("error", (err) => {
            console.log(err);
            res.send("Error");
        })

        req.pipe(boy);
    }
    catch (err) {
        console.log(err);
        throw new Error("Server side error!");
    }
}