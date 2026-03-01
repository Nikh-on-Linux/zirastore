import { pool } from "../../configs/database.config.js";
import { v4 as uuidv4 } from "uuid";

class Register {

    async email(req, res, next) {
        const { name, email, hashPassword, image } = req.body;
        const client = await pool.connect();

        try {
            const result = await client.query(
                "INSERT INTO users(name,email,password,provider,image) VALUES($1,$2,$3,$4,$5) RETURNING *",
                [name, email, hashPassword, "email", image]
            );

            console.log(result.rows[0]);

            const rootFolderId = await uuidv4();
            console.log(rootFolderId);

            const initialize = await client.query(
                "INSERT INTO folders (folder_id, user_id, parent_id, folder_name, is_root) VALUES($1, $2, $1, 'root', true) RETURNING *",
                [rootFolderId, result.rows[0].user_id]
            )

            if(initialize.rowCount == 0){
                res.status(500).json({message:"Initialization failed", suc:false});
                return;
            }

            res.status(201).json({ success: true, user: result.rows[0] });
        } catch (err) {
            console.log(err);
            if (err.code == "23505") {
                res.status(409).json({ message: "User already exist", success: false });
                return;
            }
            res.status(500).json({ message: "Internal server error", success: false });
        } finally {
            client.release();
        }
    }

    // TODO: Google provider & Microsoft Provider
}

export default Register;