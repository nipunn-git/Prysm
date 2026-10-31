const http = require('http');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const BACKEND_PORT = 8000;
const HEALTH_URL = `http://127.0.0.1:${BACKEND_PORT}/`;

// Determine root and backend paths whether executed from frontend or root
const scriptDir = __dirname;
const backendDir = fs.existsSync(path.join(scriptDir, 'backend'))
  ? path.join(scriptDir, 'backend')
  : path.resolve(scriptDir, '..', 'backend');

const logFile = path.join(backendDir, 'backend.log');

function checkBackendHealth() {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_URL, { timeout: 1500 }, (res) => {
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
    } catch (e) {
      // Continue trying next candidate
    }
  }
  return 'python';
}

async function main() {
  const isAlreadyRunning = await checkBackendHealth();
  if (isAlreadyRunning) {
    console.log('\x1b[32m%s\x1b[0m', '⚡ [Prysm] FastAPI Backend is already running on http://127.0.0.1:8000');
    return;
  }

  console.log('\x1b[36m%s\x1b[0m', '🚀 [Prysm] Backend is not running. Starting FastAPI server on http://127.0.0.1:8000...');

  const pythonCmd = findPython();
  const outLog = fs.openSync(logFile, 'a');

  // Spawn backend process detached in the background
  const child = spawn(
    pythonCmd,
    ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', String(BACKEND_PORT), '--reload'],
    {
      cwd: backendDir,
      detached: true,
      stdio: ['ignore', outLog, outLog],
      windowsHide: true
    }
  );

  child.unref();

  // Wait for server to become responsive
  const startTime = Date.now();
  const timeoutMs = 15000;
  let ready = false;

  while (Date.now() - startTime < timeoutMs) {
    await new Promise((r) => setTimeout(r, 400));
    ready = await checkBackendHealth();
    if (ready) break;
  }

  if (ready) {
    console.log('\x1b[32m%s\x1b[0m', `✓ [Prysm] FastAPI Backend started successfully (PID: ${child.pid}) on http://127.0.0.1:8000`);
  } else {
    console.warn('\x1b[33m%s\x1b[0m', `⚠️ [Prysm] Backend was launched, but port ${BACKEND_PORT} has not responded yet. Check ${logFile} for details.`);
  }
}

main().catch((err) => {
  console.error('[Prysm] Error ensuring backend:', err);
});
