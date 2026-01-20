import jwt from "jsonwebtoken";
import { configDotenv } from "dotenv";
configDotenv();

class jwtAuth {
    async assignToken(req, res, next) {
        const { email , user_id } = req.body;

        if(!email || typeof email != 'string'){
            res.status(401).json({message:"Invalid request",suc:false});
            return
        }

        try {
            const token = await jwt.sign({
                email: email,
                user_id:user_id
            }, process.env.JWT_SECRETE, { algorithm: "HS256", expiresIn: "2h" }); // IMPLEMENT RS256 later

            res.status(200).json({ message: "Authenticated successfully", suc: true, token });
        }
        catch(err){
            res.status(500).json({message:"Internal Server Error",suc:false});
            console.log(err);
        }

    }

    async verifyToken(req,res,next){
        const token = req.headers['authorization'].split(" ")[1];

        if(token == null){
            res.statu(401).json({message:"Invalide jwt request",suc:false});
            return;
        }

        jwt.verify(token,process.env.JWT_SECRETE,(err,decode)=>{
            
            if(err){
                res.status(403).json({message:"Invalid token",suc:false});
                return;
            }

            req.body = {
                email:decode.email,
                user_id:decode.user_id
            }

            next();

        })
    }
}

const jwtauth = new jwtAuth();
export default jwtauth;