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

    createFolderSchemaCheck(req, res, next) {
        try {
            FileSchema.createFolderSchema.parse(req.body);
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

    moveFileSchemaCheck(req, res, next) {
        try {
            FileSchema.moveFileSchema.parse(req.body);
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

    moveFolderSchemaCheck(req, res, next) {
        try {
            FileSchema.moveFolderSchema.parse(req.body);
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

    renameFolderSchemaCheck(req, res, next) {
        try {
            FileSchema.renameFolderSchema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                res.status(401).json({ message: "Invalid input field", suc: false });
                return;
            }
            console.log(`Error: ${error.message}`);
            res.status(500).json({ message: "Internal server error", suc: false });
        }
    }

    renameFileSchemaCheck(req, res, next) {
        try {
            FileSchema.renameFileSchema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                res.status(401).json({ message: "Invalid input field", suc: false });
                return;
            }
            console.log(`Error: ${error.message}`);
            res.status(500).json({ message: "Internal server error", suc: false });
        }
    }

}

const fileschemacheck = new SchemaCheck();
export default fileschemacheck;