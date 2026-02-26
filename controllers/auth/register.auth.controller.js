import { pool } from "../../configs/database.config.js";

class Register {

    async email(req, res, next) {
        const { name, email, hashPassword, image } = req.body;
        const client = await pool.connect();

        try {
            const result = await client.query(
                "INSERT INTO users(name,email,password,provider,image) VALUES($1,$2,$3,$4,$5) RETURNING *",
                [name, email, hashPassword, "email", image]
            );
            res.status(201).json({ success: true, user: result.rows[0] });
        } catch (err) {
            if(err.code == "23505"){
                res.status(409).json({message:"User already exist",success:false});
                return;
            }
            res.status(500).json({message:"Internal server error",success:false});
        } finally {
            client.release();
        }
    }

    // TODO: Google provider & Microsoft Provider
}

export default Register;