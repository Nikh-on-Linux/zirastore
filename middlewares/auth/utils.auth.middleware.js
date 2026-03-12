import bcrypt from "bcryptjs";
import { pool } from "../../configs/database.config.js";
import { hashSecret, parseApiKey } from "../../configs/utils/apikey.util.config.js";

export async function passwordEncrypt(req, res, next) {

    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(req.body.password, salt);

        req.body.hashPassword = hash;
        next();
    }
    catch (err) {
        throw new Error(`Password Encryption Error: ${err}`) //CHANGE TO MODULAR ERROR TEMPLATE!
    }
}

export async function agentVerification(req, res, next) {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ message: "Missing or malformed authorization header", success: false });
        return;
    }

    const apikey = authHeader.split(" ")[1];
    const parsed = parseApiKey(apikey);

    if (!parsed) {
        res.status(401).json({ message: "Invalid API key format", success: false });
        return;
    }

    const { keyId, secret } = parsed;
    const inputHash = hashSecret(secret);

    const client = await pool.connect();

    try {
        const result = await client.query(
            `SELECT k.agent_id, k.secret_hash, a.scopes FROM keys k INNER JOIN agents a ON k.key_id=$1 AND a.agent_id = k.agent_id`,
            [keyId]
        )


        if (result.rowCount == 0) {
            res.status(404).json({ message: "Invalid api key", success: false });
            return;
        }

        if (result.rows[0].secret_hash == inputHash) {
            req.body ? req.body['agent'] = { agent_id: result.rows[0].agent_id, scopes: result.rows[0].scopes } : req["body"] = { agent: { agent_id: result.rows[0].agent_id, scopes: result.rows[0].scopes } };
        }
        else {
            res.status(403).json({ message: "Access denied", success: false });
            return;
        }
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal server error", success: false });
        return;
    }
    finally {
        client.release();
    }

    next();
}