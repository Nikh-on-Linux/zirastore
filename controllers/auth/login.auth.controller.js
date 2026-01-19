import { pool } from "../../configs/database.config.js";
import bcrypt from "bcryptjs";

class Login {
    async email(req, res, next) {
        const { email, password } = req.body;
        const client = await pool.connect();
        try {
            const response = await client.query(
                "SELECT password FROM users WHERE email=$1",
                [email]
            );

            if (response.rowCount == 0) {
                res.status(404).json({ message: "User not found", suc: false });
                return;
            }

            const isCorrect = await bcrypt.compare(password, response.rows[0].password);

            if (isCorrect) {
                // res.status(200).json({ message: "Authenticated Successfully", suc: true });
                next();
                return;
            }
            res.status(401).json({ message: "Access denied", suc: false });
        }
        catch (error) {
            res.status(500).json({ message: "Internal Server Error", suc: false });
            console.log(error);
        }
        finally {
            client.release();
        }
    }
}

const login = new Login();
export default login;
