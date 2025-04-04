import dotenv from "dotenv";

dotenv.config();

export const config = {
  PORT: parseInt(process.env.PORT || "3000"),
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  REDIS_PORT: parseInt(process.env.REDIS_PORT || "6379"),
 
  LLM_API_KEY: process.env.LLM_API_KEY || ,
  LLM_API_BASE_URL: process.env.LLM_API_BASE_URL || "https://openrouter.ai/api/v1",
  LLM_MODEL: process.env.LLM_MODEL || "openrouter/quasar-alpha", // Default model if not set
  // LLM_MODEL: process.env.LLM_MODEL || "deepseek/deepseek-chat-v3-0324:free",
};
