# AI Autonomous Agent Server

This project implements an AI autonomous agent backend powered by a Large Language Model (LLM). It exposes an Express API endpoint to receive tasks, processes them using various services (web browsing, terminal commands, report generation), and returns the results.

## Features

*   **Express API:** Provides a simple POST endpoint (`/task`) to submit tasks.
*   **LLM Integration:** Uses an LLM (configurable via OpenRouter or other compatible APIs) to understand tasks and orchestrate actions based on a custom plan-action-observation loop.
*   **Web Browsing:** Can search the web (DuckDuckGo) and scrape website content using Playwright.
*   **Terminal Commands:** Can execute shell commands securely within a Docker container.
*   **Report Generation:** Can generate reports from provided content in `.txt`, `.doc`, or `.pdf` formats and save them to the `output/` directory.
*   **Configurable:** Uses environment variables for API keys, model selection, and server port.

## Prerequisites

*   [Node.js](https://nodejs.org/) (LTS version recommended)
*   [Bun](https://bun.sh/) (Used as the runtime/package manager)
*   [Docker](https://www.docker.com/get-started/) (Required for the `terminalService`)

## Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd ai-agent
    ```
2.  **Install dependencies:**
    ```bash
    bun install
    ```
3.  **Create a `.env` file:**
    Create a file named `.env` in the project root directory.
4.  **Configure Environment Variables:**
    Add the following variables to your `.env` file:

    ```dotenv
    # Required: Your LLM API Key (e.g., from OpenRouter)
    LLM_API_KEY=your_llm_api_key_here

    # Optional: Base URL for the LLM API (defaults to OpenRouter)
    # LLM_API_BASE_URL=https://openrouter.ai/api/v1

    # Optional: Specific LLM model to use (defaults to openrouter/quasar-alpha)
    # LLM_MODEL=openrouter/quasar-alpha

    # Optional: Server port (defaults to 3000)
    # PORT=3000

    # Optional: Redis configuration (if used, currently seems unused)
    # REDIS_HOST=localhost
    # REDIS_PORT=6379
    ```
    Replace `your_llm_api_key_here` with your actual API key.

## Running the Server

Start the Express server using Bun:

```bash
bun run src/index.ts
The server will start, typically on http://localhost:3000.

API Endpoint
POST /task
Submit a task for the AI agent to perform.

URL: /task
Method: POST
Body (JSON):
{
  "task": "Your task description here"
}
Example Request (using curl):
curl -X POST http://localhost:3000/task \
     -H "Content-Type: application/json" \
     -d '{"task": "Find the top 3 news headlines about renewable energy and save them to a text file."}'
Success Response (200 OK):
{
  "success": true,
  "result": "Report containing top 3 news headlines about renewable energy has been generated successfully."
}
Error Response (4xx/5xx):
{
  "success": false,
  "error": "Error message describing the issue"
}
Project Structure
.
├── output/             # Generated reports are saved here
├── src/
│   ├── index.ts        # Express server entry point
│   ├── services/       # Core functionalities
│   │   ├── browserService.ts # Web search and scraping
│   │   ├── llm-client.ts   # LLM interaction logic
│   │   ├── reportService.ts  # Report generation (txt, doc, pdf)
│   │   └── terminalService.ts# Secure terminal command execution
│   ├── types/          # TypeScript type definitions
│   │   └── task.ts       # Task interface
│   └── utils/          # Utility functions and configuration
│       ├── config.ts     # Environment variable handling
│       ├── logger.ts     # Logging setup
│       └── prompt.ts     # System prompt for the LLM
├── .env                # Environment variables (create this file)
├── .gitignore          # Git ignore rules
├── bun.lockb           # Bun lockfile
├── package.json        # Project dependencies
└── README.md           # This file