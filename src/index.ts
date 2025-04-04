import express, { Request, Response } from 'express';
import { processLLMTask } from './services/llm-client';
import { logger } from './utils/logger'; // Assuming logger is configured

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// POST endpoint to accept tasks
app.post('/task', async (req: Request, res: Response) => {
    const taskContent = req.body.task;

    if (!taskContent || typeof taskContent !== 'string') {
        logger.warn('Received invalid task request: Task content missing or not a string.');
        return res.status(400).json({ error: 'Invalid request body. Please provide a "task" property with a string value.' });
    }

    logger.info(`Received task: "${taskContent}"`);

    try {
        const result = await processLLMTask(taskContent);
        logger.info(`Task completed successfully. Result: ${result}`);
        res.json({ success: true, result: "Check Output folder" });
    } catch (error) {
        logger.error(`Error processing task "${taskContent}":`, error);
        // Check if error is an instance of Error to safely access message
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        res.status(500).json({ success: false, error: errorMessage });
    }
});

// Basic root route
app.get('/', (req: Request, res: Response) => {
    res.send('LLM Agent Server is running. Use POST /task to submit tasks.');
});

// Start the server
app.listen(port, () => {
    logger.info(`Server running at http://localhost:${port}`);
});
