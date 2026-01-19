import { Router } from "express";
import express from "express";

// Middleware imports
import { emailRegisterSchema } from "../middlewares/auth/register.auth.middleware.js";
import { emailLoginSchema } from "../middlewares/auth/login.auth.middleware.js";
import { passwordEncrypt } from "../middlewares/auth/utils.auth.middleware.js";
import JwtAuth from "../middlewares/auth/jwt.auth.middleware.js";

// Controllers import 
import Register from "../controllers/auth/register.auth.controller.js";
import Login from "../controllers/auth/login.auth.controller.js";

//setups
const router = Router();

const register = new Register();

router.use(express.json({
    limit: "1mb",
    strict: true,
    type: "application/json"
}));


//endpoints
router.get('/', (req, res) => { res.send("This is a router") });
router.post('/register', emailRegisterSchema, passwordEncrypt, register.email);
router.post('/login', emailLoginSchema, Login.email, JwtAuth.assignToken);

export default router;