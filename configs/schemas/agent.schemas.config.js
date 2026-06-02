import * as z from "zod";

class AgentSchema {
    constructor() {
        this.editAgentSchema = z.object({
            name: z.string().nonoptional(),
            path: z.string().nonempty(),
            scopes: z.enum(['r', 'w', 'rw', 'rwx']).nonoptional(),
        })
    }
}

const agentSchema = new AgentSchema();
export default agentSchema;