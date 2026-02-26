import AuthSchema from "../../configs/schemas/auth.schemas.config.js";
import z from "zod";

export function emailRegisterSchema(req, res, next) {

    try {
        AuthSchema.emailRegisterSchema.parse(req.body);
        next();
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            res.status(422).json({
                message: "Invalid data",
                success: false
            })
            return
        }
        console.log(error);
        res.status(500).json({
            message: "Internal server error",
            success: false
        })
    }

}