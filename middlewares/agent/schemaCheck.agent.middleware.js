import AgentSchema from "../../configs/schemas/agent.schemas.config.js";
import z from "zod";

class AgentSchemaCheck{
    editAgentSchemaCheck(req,res,next){
        try {
            AgentSchema.editAgentSchema.parse(req.body);
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

const agentSchemaCheck = new AgentSchemaCheck();
export default agentSchemaCheck;