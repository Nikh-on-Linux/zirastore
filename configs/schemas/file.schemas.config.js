import * as z from "zod";

class FileSchema {
    constructor() {

        this.uploadSchema = z.object({
            title: z.string().min(1),
            description: z.string().optional()
        })

    }
}

const fileSchema = new FileSchema();
export default fileSchema;