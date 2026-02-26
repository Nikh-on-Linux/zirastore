import { Router } from "express";
import express from "express";

const router = Router();
router.use(express.json());

router.get('/',(req,res)=>{res.send("Streaming Endpoint")});

export default router;