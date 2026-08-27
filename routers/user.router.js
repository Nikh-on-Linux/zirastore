import { Router } from "express";
import express from "express";
import JWtAuth from "../middlewares/auth/jwt.auth.middleware.js";
import Dashboard from "../controllers/user/dashboard.user.controller.js";
import UserControlls from "../controllers/user/api.user.controller.js";
import { agentVerification, passwordEncrypt } from "../middlewares/auth/utils.auth.middleware.js";
import AgentSchemaCheck from "../middlewares/agent/schemaCheck.agent.middleware.js";
import FileSchemaCheck from "../middlewares/file/schemaCheck.file.middleware.js";

const router = Router();
router.use(express.json());

router.get("/", (req, res) => {
    res.send("User api endpoint");
})
router.patch("/", agentVerification, Dashboard.editUser);
router.patch("/password", passwordEncrypt ,agentVerification, Dashboard.updatePassword);
router.get("/me", JWtAuth.verifyToken, Dashboard.recentFiles);
router.get("/info", agentVerification, Dashboard.userInfo);
router.get('/agents', agentVerification, Dashboard.showAgents);
router.patch('/agent/:id', AgentSchemaCheck.editAgentSchemaCheck, agentVerification, UserControlls.editAgent);
router.delete('/agent/:id', agentVerification, UserControlls.deleteAgent);
router.post("/createfolder/:folderName", FileSchemaCheck.createFolderSchemaCheck, agentVerification, UserControlls.createFolder);
router.post("/move/folder", FileSchemaCheck.moveFolderSchemaCheck, agentVerification, UserControlls.moveFolder);
router.post("/move/file/:filename", FileSchemaCheck.moveFileSchemaCheck, agentVerification, UserControlls.moveFile);
router.post("/rename/file/:filename", FileSchemaCheck.renameFileSchemaCheck, agentVerification, UserControlls.renameFile);
router.post("/rename/folder", FileSchemaCheck.renameFolderSchemaCheck, agentVerification, UserControlls.renameFolder);
router.post("/directory",agentVerification,Dashboard.showDirectory);
// testing callback
router.post('/webhook/callback',(req,res)=>{
    res.status(200).json({message:"Got your response", data:req.body})
    console.log(req.body);
})

export default router;