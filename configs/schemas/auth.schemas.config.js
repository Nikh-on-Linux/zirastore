import * as z from "zod";

class AuthSchema {
    constructor() {

        this.emailRegisterSchema = z.object({
            email: z.email().nonempty(),
            name: z.string().nonempty(),
            password: z.string().nonempty(),
            image: z.string().nullable().optional(),
            provider: z.literal(['email', 'google'])
        })

        this.emailLoginSchema = z.object({
            email:z.email(),
            password:z.string()
        })

    }
}

const authSchema = new AuthSchema();
export default authSchema;