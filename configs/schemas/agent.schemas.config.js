import * as z from "zod";

class AgentSchema {
    constructor() {
        this.editAgentSchema = z.object({
            name: z.string().nonoptional(),
            path: z.string().nonempty(),
            scopes: z.enum(['r', 'w', 'rw', 'rwx']).nonoptional(),
            webhook:z.object({
                target_url:z.string().optional(),
                enabled:z.boolean().optional(),
                event_type:z.string()
            })
        })
    }
}

const agentSchema = new AgentSchema();
export default agentSchema;