import { createLogger, format, transports } from "winston";

export const logger = createLogger({
  level: "info",
  format: format.combine(
    format.colorize(), // Add color to logs
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), // Add timestamp
    format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`) // Custom log format
  ),
  transports: [
    new transports.Console(), // Log to console
  ],
});