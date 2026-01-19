import z from "zod";
import AuthSchema from "../../configs/schemas/auth.schemas.config.js";  

export function emailLoginSchema(req,res,next){
    try{
        AuthSchema.emailLoginSchema.parse(req.body);
        next();
    }
    catch(error){
        if(error instanceof z.ZodError){
            res.status(401).json({message:"Invalid input field",suc:false});
            return;
        }

        res.status(500).json({message:"Internal Server Error",suc:false});
    }
}