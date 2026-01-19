import bcrypt from "bcryptjs";

export async function passwordEncrypt(req, res, next) {
        
        try {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(req.body.password, salt);

            req.body.hashPassword = hash;
            next();
        }
        catch(err){
            throw new Error(`Password Encryption Error: ${err}`) //CHANGE TO MODULAR ERROR TEMPLATE!
        }
    }