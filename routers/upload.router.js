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

// Config
const router = Router();
router.use(express.json());
router.use(JwtAuth.verifyToken);

// Endpoints
router.post("/",uploadFile);

export default router;
