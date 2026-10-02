const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Directories
const frontendDir = __dirname;
const rootDir = fs.existsSync(path.join(frontendDir, 'backend'))
  ? frontendDir
  : path.resolve(frontendDir, '..');
const backendDir = path.join(rootDir, 'backend');

const BACKEND_PORT = 8000;
const HEALTH_URL = `http://127.0.0.1:${BACKEND_PORT}/`;

// Colors for terminal output
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function log(prefix, color, message) {
  const lines = message.toString().split('\n');
  for (const line of lines) {
    if (line.trim().length > 0) {
      console.log(`${color}${BOLD}[${prefix}]${RESET} ${line}`);
    }
  }
}

function checkBackend() {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_URL, { timeout: 1000 }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

function findPython() {
  const candidates = [
    process.env.PYTHON,
    'python',
    'py',
    'python3',
    'C:\\Users\\NIPUN\\AppData\\Local\\Programs\\Python\\Python312\\python.exe',
    'C:\\Users\\NIPUN\\AppData\\Local\\Programs\\Python\\Python313\\python.exe'
  ].filter(Boolean);

  for (const cmd of candidates) {
    try {
      execSync(`"${cmd}" --version`, { stdio: 'ignore' });
      return cmd;
    } catch (e) {}
  }
  return 'python';
}

let backendProcess = null;
let frontendProcess = null;
let isShuttingDown = false;

function cleanup() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n${YELLOW}[PromptHub] Shutting down all servers...${RESET}`);

  if (backendProcess && backendProcess.pid) {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${backendProcess.pid} /T /F`, { stdio: 'ignore' });
      } else {
        backendProcess.kill('SIGTERM');
      }
    } catch (e) {}
  }

  if (frontendProcess && frontendProcess.pid) {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${frontendProcess.pid} /T /F`, { stdio: 'ignore' });
      } else {
        frontendProcess.kill('SIGTERM');
      }
    } catch (e) {}
  }

  process.exit(0);
}

// Windows Ctrl+C handling
if (process.platform === 'win32') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.on('SIGINT', () => cleanup());
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

async function start() {
  console.log(`${BOLD}${GREEN}==============================================${RESET}`);
  console.log(`${BOLD}${GREEN}       PromptHub Unified Development Server    ${RESET}`);
  console.log(`${BOLD}${GREEN}==============================================${RESET}\n`);

  // Step 1: Check if backend is already running
  const backendRunning = await checkBackend();
  if (backendRunning) {
    console.log(`${GREEN}✓ [PromptHub] FastAPI Backend is already active on http://127.0.0.1:${BACKEND_PORT}${RESET}`);
  } else {
    console.log(`${CYAN}🚀 [PromptHub] Starting FastAPI Backend on http://127.0.0.1:${BACKEND_PORT}...${RESET}`);
    const pythonCmd = findPython();
    backendProcess = spawn(
      pythonCmd,
      ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', String(BACKEND_PORT), '--reload'],
      {
        cwd: backendDir,
        shell: false
      }
    );

    backendProcess.stdout.on('data', (data) => log('Backend', MAGENTA, data));
    backendProcess.stderr.on('data', (data) => log('Backend', MAGENTA, data));

    backendProcess.on('close', (code) => {
      if (!isShuttingDown && code !== 0) {
        console.error(`${YELLOW}[PromptHub] Backend exited with code ${code}${RESET}`);
      }
    });

    // Wait up to 10 seconds for backend to be ready
    const startTime = Date.now();
    let ready = false;
    while (Date.now() - startTime < 10000) {
      await new Promise((r) => setTimeout(r, 400));
      ready = await checkBackend();
      if (ready) break;
    }

    if (ready) {
      console.log(`${GREEN}✓ [PromptHub] FastAPI Backend is ready!${RESET}\n`);
    } else {
      console.warn(`${YELLOW}⚠️ [PromptHub] Backend starting slower than usual, proceeding with Frontend...${RESET}\n`);
    }
  }

  // Step 2: Start Next.js Frontend
  console.log(`${CYAN}⚡ [PromptHub] Starting Next.js Frontend on http://localhost:3000...${RESET}\n`);
  const isWindows = process.platform === 'win32';
  const npxCmd = isWindows ? 'npx.cmd' : 'npx';

  frontendProcess = spawn(npxCmd, ['next', 'dev'], {
    cwd: frontendDir,
    shell: isWindows,
    stdio: 'inherit'
  });

  frontendProcess.on('close', (code) => {
    if (!isShuttingDown) {
      cleanup();
    }
  });
}

start().catch((err) => {
  console.error('[PromptHub] Failed to start:', err);
  cleanup();
});
