import { OpenAI } from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions"; // Message type
import { config } from "../utils/config";
import { logger } from "../utils/logger";

import { reportService } from "./reportService";
import { browserService } from "./browserService";
import { terminalService } from "./terminalService";
import { SYSTEM_PROMPT } from "../utils/prompt";
import { Task } from "../types/task";

const client = new OpenAI({
    apiKey: config.LLM_API_KEY,
    baseURL: config.LLM_API_BASE_URL,
});

let msgs: ChatCompletionMessageParam[] = [{ role: "system", content: SYSTEM_PROMPT }];

const tools = {
    reportService: async (input: { content: string; fileType: string }) => {
        logger.info("Calling reportService...");
        return await reportService(input);
    },
    browserService: async (input: { name: string; noOfResponses: number }) => {
        logger.info("Calling browserService...");
        const task: Task = { instruction: JSON.stringify(input) };
        return await browserService(task);
    },
    terminalService: async (input: { command: string; args: string[] }) => {
        logger.info("Calling terminalService...");
        const task: Task = { instruction: JSON.stringify(input) };
        return await terminalService(task);
    },
};

// Process LLM tasks following a custom plan-action-observation loop
export const processLLMTask = async (taskContent: string) => {
    const initialUserMessage = JSON.stringify({ type: "user", content: taskContent });
    msgs = [{ role: "system", content: SYSTEM_PROMPT }]; // Reset history
    msgs.push({ role: "user", content: initialUserMessage });
    logger.info("Starting LLM task with:", initialUserMessage);

    let maxTurns = 10; // Safety break
    let turns = 0;

    while (turns < maxTurns) {
        turns++;
        logger.info(`Turn ${turns}: Sending messages to LLM...`);

        const response = await client.chat.completions.create({
            messages: msgs,
            model: config.LLM_MODEL,
            response_format: { type: "json_object" }, // Expect JSON response
        });

        const result = response.choices[0].message.content;
        if (!result) {
            logger.error("LLM returned empty content.");
            throw new Error("LLM returned empty content.");
        }

        msgs.push({ role: "assistant", content: result });
        logger.info("LLM Raw Response:", result);

        let actionTask: any;
        let jsonContent = result;

        // Attempt to extract JSON content if wrapped in markdown fences
        const codeBlockMatch = result.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
            jsonContent = codeBlockMatch[1];
            logger.info("Extracted JSON from markdown code block.");
        } else {
             logger.info("No markdown code block detected, attempting to parse raw response.");
        }

        try {
            actionTask = JSON.parse(jsonContent);
        } catch (error) {
            const errorMsg = `Failed to parse LLM JSON response. Content: "${jsonContent}". Error: ${error.message}`;
            logger.error(errorMsg);
            // Send observation back to LLM about the parse error
            const obs = { type: "observation", content: `Error: Could not parse your JSON response. Please ensure it's valid JSON. ${error.message}` };
            msgs.push({ role: "user", content: JSON.stringify(obs) });
            continue;
        }

        logger.info("Parsed LLM Response:", actionTask);

        if (actionTask.type === "output") {
            logger.info("Task completed successfully. Final Output:", actionTask.output);
            return actionTask.output;
        } else if (actionTask.type === "action") {
            const { function: functionName, input } = actionTask;
            if (!tools[functionName]) {
                const errorMsg = `Unknown function requested: ${functionName}. Available functions are: ${Object.keys(tools).join(', ')}`;
                logger.error(errorMsg);
                 // Send observation back to LLM about the error
                const obs = { type: "observation", content: `Error: ${errorMsg}` };
                msgs.push({ role: "user", content: JSON.stringify(obs) });
                continue;
            }

            try {
                logger.info(`Executing action: ${functionName} with input:`, input);
                const observationResult = await tools[functionName](input);
                const obs = { type: "observation", content: observationResult };
                msgs.push({ role: "user", content: JSON.stringify(obs) });
                logger.info("Added observation:", JSON.stringify(obs));
            } catch (error) {
                const errorMsg = `Error executing function ${functionName}: ${error.message}`;
                logger.error(errorMsg);
                // Send observation back to LLM about the execution error
                const obs = { type: "observation", content: `Error: ${errorMsg}` };
                msgs.push({ role: "user", content: JSON.stringify(obs) });
            }
        } else if (actionTask.type === "plan") {
            logger.info("LLM provided a plan:", actionTask.plan);
            // Add instruction for LLM to execute the plan
            const instructionMsg = { type: "instruction", content: "Now execute the action for the plan you just provided." };
            msgs.push({ role: "user", content: JSON.stringify(instructionMsg) });
            logger.info("Added instruction to execute the plan.");
        } else {
            const errorMsg = `LLM returned unexpected type: '${actionTask.type}'. Expected 'action', 'plan', or 'output'.`;
             logger.error(errorMsg);
             // Send observation back to LLM about the error
             const obs = { type: "observation", content: `Error: ${errorMsg}` };
             msgs.push({ role: "user", content: JSON.stringify(obs) });
        }
    }

    if (turns >= maxTurns) {
        logger.warn("Reached maximum turns limit.");
        throw new Error("Task processing reached maximum turns limit.");
    }
};

// Example test call (comment out or remove for production)
// processLLMTask("Research renewable energy, analyze trends, create PDF ");
