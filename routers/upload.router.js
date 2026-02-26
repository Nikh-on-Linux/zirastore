import { Router } from "express";
import express from "express";

// Middleware imports
import JwtAuth from "../middlewares/auth/jwt.auth.middleware.js";
import SchemaCheck from "../middlewares/file/schemaCheck.file.middleware.js";

// Controller imports
import { uploadFile } from "../controllers/file/upload.file.controller.js";
import { initiateUpload, uploadPart, completeUpload } from "../controllers/file/chunkupload.file.controller.js";

// Config
const router = Router();
router.use(express.json());

// Endpoints
router.post("/",uploadFile);
router.post("/init",JwtAuth.verifyToken, initiateUpload);
router.put("/:uploadId/parts/:partNumber", express.raw({ type: "*/*", limit: "100mb" }), uploadPart);
router.post("/:uploadId/complete/:uploadfilehash", completeUpload);
export default router;
