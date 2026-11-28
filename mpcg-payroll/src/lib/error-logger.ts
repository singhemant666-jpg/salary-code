import fs from 'fs';
import path from 'path';

export interface SystemErrorEntry {
  id: string;
  timestamp: string;
  source: string;
  message: string;
  digest?: string;
  stack?: string;
  context?: Record<string, unknown>;
}

const MAX_IN_MEMORY_LOGS = 200;
const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'system-errors.log');

const globalForLogs = globalThis as unknown as {
  __mpcgErrorLogs?: SystemErrorEntry[];
};

if (!globalForLogs.__mpcgErrorLogs) {
  globalForLogs.__mpcgErrorLogs = [];
}

function formatError(err: unknown): { message: string; stack?: string; digest?: string } {
  if (err instanceof Error) {
    return {
      message: err.message || 'Unknown Error',
      stack: err.stack,
      digest: (err as any).digest,
    };
  }
  if (typeof err === 'string') {
    return { message: err };
  }
  try {
    return { message: JSON.stringify(err) };
  } catch {
    return { message: String(err) };
  }
}

export function logSystemError(
  source: string,
  error: unknown,
  context?: Record<string, unknown>
): SystemErrorEntry {
  const parsed = formatError(error);
  const entry: SystemErrorEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    source,
    message: parsed.message,
    digest: parsed.digest,
    stack: parsed.stack,
    context,
  };

  try {
    const logs = globalForLogs.__mpcgErrorLogs!;
    logs.unshift(entry);
    if (logs.length > MAX_IN_MEMORY_LOGS) {
      logs.length = MAX_IN_MEMORY_LOGS;
    }
  } catch {}

  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf8');
  } catch {}

  console.error(`[SystemError][${source}] ${parsed.message}`, context || '');
  return entry;
}

export function getSystemErrors(limit = 100): SystemErrorEntry[] {
  const memLogs = globalForLogs.__mpcgErrorLogs || [];
  if (memLogs.length > 0) {
    return memLogs.slice(0, limit);
  }

  // Fallback to disk log if server restarted
  try {
    if (fs.existsSync(LOG_FILE)) {
      const lines = fs
        .readFileSync(LOG_FILE, 'utf8')
        .split('\n')
        .filter(Boolean)
        .slice(-limit)
        .reverse();
      return lines
        .map((line) => {
          try {
            return JSON.parse(line) as SystemErrorEntry;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as SystemErrorEntry[];
    }
  } catch {}

  return [];
}

export function clearSystemErrors(): void {
  globalForLogs.__mpcgErrorLogs = [];
  try {
    if (fs.existsSync(LOG_FILE)) {
      fs.writeFileSync(LOG_FILE, '', 'utf8');
    }
  } catch {}
}
