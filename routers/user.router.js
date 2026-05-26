import { Router } from "express";
import express from "express";
import JWtAuth from "../middlewares/auth/jwt.auth.middleware.js";
import Dashboard from "../controllers/user/dashboard.user.controller.js";
import { agentVerification } from "../middlewares/auth/utils.auth.middleware.js";

const router = Router();
router.use(express.json());

router.get("/",(req,res)=>{
    res.send("User api endpoint");
})
router.get("/me",JWtAuth.verifyToken,Dashboard.recentFiles)
router.post("/createfolder/:folderName", agentVerification, Dashboard.createFolder);
router.post("/move/folder",agentVerification, Dashboard.moveFolder);
router.post("/move/file/:filename",agentVerification , Dashboard.moveFile);

export default router;