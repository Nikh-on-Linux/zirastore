import FileSchema from "../../configs/schemas/file.schemas.config.js";
import z from "zod";

class SchemaCheck {

    uploadSchemaCheck(req, res, next) {
        try {
            FileSchema.uploadSchema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                res.status(401).json({ message: "Invalid input field", suc: false });
                return;
            }

            res.status(500).json({ message: "Internal Server Error", suc: false });
        }
    }

}

const schemacheck = new SchemaCheck();
export default schemacheck;