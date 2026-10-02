const { execSync } = require('child_process');

console.log('[PromptHub] Stopping any running backend processes on port 8000...');

try {
  if (process.platform === 'win32') {
    // Find PID on port 8000
    const output = execSync('netstat -ano | findstr :8000', { encoding: 'utf8' });
    const lines = output.split('\n');
    const pids = new Set();
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5 && parts[1].includes(':8000')) {
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0') pids.add(pid);
      }
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`);
        console.log(`[PromptHub] Terminated process ${pid}`);
      } catch (e) {}
    }
  } else {
    execSync('fuser -k 8000/tcp || lsof -ti:8000 | xargs kill -9', { stdio: 'ignore' });
  }
  console.log('[PromptHub] Backend stopped successfully.');
} catch (e) {
  console.log('[PromptHub] No active backend process found on port 8000.');
}
