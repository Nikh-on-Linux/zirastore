import * as z from "zod";

class FileSchema {
    constructor() {

        this.uploadSchema = z.object({
            title: z.string().min(1),
            description: z.string().optional()
        })

        this.createFolderSchema = z.object({
            path: z.string().nonoptional()
        })

        this.moveFolderSchema = z.object({
            sourcePath: z.string().nonoptional(),
            destinationPath: z.string().nonoptional()
        })

        this.moveFileSchema = z.object({
            sourcePath: z.string().nonoptional(),
            destinationPath: z.string().nonoptional()
        })

        this.renameFolderSchema = z.object({
            sourcePath:z.string().nonoptional(),
            newName:z.string().nonoptional()
        })

        this.renameFileSchema = z.object({
            sourcePath:z.string().nonoptional(),
            newName:z.string().nonoptional()
        })

        this.getDirectorySchema = z.object({
            path:z.string().nonempty().nonoptional()
        })
    }
}

const fileSchema = new FileSchema();
export default fileSchema;