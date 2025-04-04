import { exec, spawn } from 'child_process';
import { Task } from '../types/task'; // Updated import

const blockedCommands = ['rm', 'shutdown', 'reboot', 'halt', 'poweroff'];

export function terminalService(task: Task): Promise<string> {
    return new Promise((resolve, reject) => {
        let command: string;
        let args: string[];
        try {
            const parsedInstruction = JSON.parse(task.instruction);
            command = parsedInstruction.command;
            args = parsedInstruction.args || [];
            if (!command || typeof command !== 'string') {
                throw new Error("Invalid 'command' property in instruction");
            }
            if (!Array.isArray(args)) {
                throw new Error("Invalid 'args' property in instruction, must be an array");
            }
        } catch (e) {
            return reject(new Error(`Failed to parse task instruction: ${e.message}`));
        }


        // Check if the command is blocked
        if (blockedCommands.some(blocked => command === blocked || command.startsWith(blocked + ' '))) {
             return reject(new Error(`Blocked command detected: '${command}'. Execution denied.`));
        }
        // Also check args for blocked commands just in case
        if (args.some(arg => blockedCommands.some(blocked => arg === blocked))) {
            return reject(new Error(`Blocked command detected within arguments. Execution denied.`));
        }

        // Use spawn for better argument handling and security
        const dockerArgs = ['run', '--rm', 'alpine', command, ...args];
        const process = spawn('docker', dockerArgs);

        let stdoutData = '';
        let stderrData = '';

        process.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });

        process.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        process.on('error', (error) => {
            // Handle errors like 'docker' command not found
            reject(new Error(`Spawn error: ${error.message}`));
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve(stdoutData.trim());
            } else {
                // Reject with stderr if available, otherwise provide a generic error
                const errorMessage = stderrData.trim() || `Command failed with exit code ${code}`;
                reject(new Error(errorMessage));
            }
        });
    });
}

export function startTerminalSession(): { sendCommand: (command: string) => Promise<string>, closeSession: () => void } {
    const dockerProcess = spawn('docker', ['run', '--rm', '-i', 'alpine', 'sh'], { stdio: 'pipe' }); // Removed '-t'
    let timeout: NodeJS.Timeout;

    const resetTimeout = () => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
            dockerProcess.stdin.end();
            dockerProcess.kill();
        }, 30000); // 30 seconds
    };

    resetTimeout();

    return {
        sendCommand: (command: string) => {
            return new Promise((resolve, reject) => {
                if (blockedCommands.some(blocked => command.includes(blocked))) {
                    return reject(new Error('Blocked command detected.'));
                }

                resetTimeout();
                dockerProcess.stdin.write(`${command}\n`);
                dockerProcess.stdout.once('data', (data) => {
                    resolve(data.toString().trim());
                });

                dockerProcess.stderr.once('data', (error) => {
                    reject(new Error(error.toString().trim()));
                });
            });
        },
        closeSession: () => {
            if (timeout) clearTimeout(timeout);
            dockerProcess.stdin.end();
            dockerProcess.kill();
        }
    };
}

// Example usage of terminalService
// const exampleTask = { command: 'ls', args: ['--help'] };
// terminalService(exampleTask)
//     .then(output => console.log('Output:', output))
//     .catch(error => console.error('Error:', error.message));

// Example usage of startTerminalSession
// const session = startTerminalSession();

// session.sendCommand('bun --version')
//     .then(output => console.log('Session Output:', output))
//     .catch(error => console.error('Session Error:', error.message));

// // Automatically close the session after 5 seconds for demonstration
// setTimeout(() => {
//     session.closeSession();
//     console.log('Session closed.');
// }, 5000);
