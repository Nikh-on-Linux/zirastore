import jwt from "jsonwebtoken";
import { configDotenv } from "dotenv";
configDotenv();

class jwtAuth {
    async assignToken(req, res, next) {
        const { email } = req.body;

        if(!email || typeof email != 'string'){
            res.status(401).json({message:"Invalid request",suc:false});
            return
        }

        try {
            const token = await jwt.sign({
                email: email
            }, process.env.JWT_SECRETE, { algorithm: "HS256", expiresIn: "2h" }); // IMPLEMENT RS256 later

            res.status(200).json({ message: "Authenticated successfully", suc: true, token });
        }
        catch(err){
            res.status(500).json({message:"Internal Server Error",suc:false});
            console.log(err);
        }

    }
}

const jwtauth = new jwtAuth();
export default jwtauth;