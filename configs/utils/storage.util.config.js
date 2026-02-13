import fs from "fs";
import os from "os";
import path from "path";

export function getTmpUploadDir(uploadId) {
    const dir = path.join(os.homedir(), "zirastore", "tmp", uploadId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

export function getFinalObjectPath(objectId) {
    const base = path.join(os.homedir(), "zirastore", "objects");
    const prefix1 = objectId.substring(0, 2);
    const prefix2 = objectId.substring(2, 4);

    const dir = path.join(base, prefix1, prefix2);
    fs.mkdirSync(dir, { recursive: true });

    return path.join(dir, objectId);
}
