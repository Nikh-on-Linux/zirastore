import { Router } from "express";
import express from "express";
import path from "path";
import fs from "fs";
import os from "os";

// Middleware imports
import JwtAuth from "../middlewares/auth/jwt.auth.middleware.js";
import SchemaCheck from "../middlewares/file/schemaCheck.file.middleware.js";

// Controller imports
import { uploadFile } from "../controllers/file/upload.file.controller.js";
import { initiateUpload, uploadPart, completeUpload } from "../controllers/file/chunkupload.file.controller.js";

// Config
const router = Router();
router.use(express.json());
// router.use(JwtAuth.verifyToken);

// Endpoints
router.post("/",uploadFile);
router.post("/init", initiateUpload);
router.put("/:uploadId/parts/:partNumber", express.raw({ type: "*/*", limit: "100mb" }), uploadPart);
router.post("/:uploadId/complete/:uploadfilehash", completeUpload);
export default router;
