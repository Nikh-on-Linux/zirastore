import { Router } from "express";
import express from "express";
import StreamFile from "../controllers/file/stream.file.controller.js";
import JwtAuth from "../middlewares/auth/jwt.auth.middleware.js";
import { agentVerification } from "../middlewares/auth/utils.auth.middleware.js";

const router = Router();
router.use(express.json());

router.get('/', (req, res) => { res.send("Streaming Endpoint") });
router.get('/:fileId', agentVerification, StreamFile.fileInfo);
router.get('/file/:object', StreamFile.stream) //Need to improve security.

export default router;