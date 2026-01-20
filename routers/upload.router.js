import { Router } from "express";
import express from "express";

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
// router.get("/");
router.post("/",uploadFile);

export default router;
