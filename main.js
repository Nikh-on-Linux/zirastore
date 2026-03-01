import express from "express";
import authrouter from "./routers/auth.router.js";
import uploadrouter from "./routers/upload.router.js";
import streamRouter from "./routers/stream.router.js";
import userRouter from "./routers/user.router.js";

const app = express();
app.use('/auth', authrouter);
app.use('/upload',uploadrouter);
app.use('/stream',streamRouter);
app.use('/user',userRouter);
app.get('/', (req, res) => {
    res.send('Hellow');
})

app.listen(4500, "0.0.0.0", () => {
    console.log('Hosted successfully on port 4500');
})