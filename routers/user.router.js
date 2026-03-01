import { Router } from "express";
import express from "express";
import JWtAuth from "../middlewares/auth/jwt.auth.middleware.js";
import Dashboard from "../controllers/user/dashboard.user.controller.js";

const router = Router();
router.use(express.json());

router.get("/",(req,res)=>{
    res.send("User api endpoint");
})
router.get("/me",JWtAuth.verifyToken,Dashboard.recentFiles)

export default router;