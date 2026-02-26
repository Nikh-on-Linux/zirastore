import { error } from "console";
import express from "express";
import fs from "fs";
import busboy from "busboy";
import { pool } from "./configs/database.config.js";
import authrouter from "./routers/auth.router.js";
import uploadrouter from "./routers/upload.router.js";
import streamRouter from "./routers/stream.router.js";

const app = express();
app.use('/auth', authrouter);
app.use('/upload',uploadrouter);
app.use('/stream',streamRouter);
app.get('/', (req, res) => {
    res.send('Hellow');
})

// app.post('/uploads', (req, res) => {
//     try {
//         const boy = busboy({ headers: req.headers });
//         boy.on('file', (name, file,info) => {
//             const writeStream = fs.createWriteStream(info.filename);
//             file.pipe(writeStream);
//         })
//         boy.on('finish',()=>{
//             res.send('It worked');
//         })
//         boy.on("error",(err)=>{
//             console.log(err);
//             res.send("Error");
//         })

//         req.pipe(boy);
//     }
//     catch (err) {
//         console.log(err);
//         throw new Error("Server side error!");
//     }
// })

app.listen(4500, "0.0.0.0", () => {
    console.log('Hosted successfully on port 4500');
})