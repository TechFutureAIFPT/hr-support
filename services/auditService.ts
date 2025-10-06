// Audit logging service for tracking API calls and results
interface AuditEntry {
  timestamp: number;
  operation: string;
  parameters: Record<string, any>;
  result: any;
  duration: number;
  error?: string;
}

class AuditLogger {
  private logs: AuditEntry[] = [];
  private readonly maxLogs = 1000; // Keep last 1000 entries

  log(operation: string, parameters: Record<string, any>, result: any, duration: number, error?: string) {
    const entry: AuditEntry = {
      timestamp: Date.now(),
      operation,
      parameters: this.sanitizeParameters(parameters),
      result: this.sanitizeResult(result),
      duration,
      error
    };

    this.logs.push(entry);

    // Maintain max size
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // In development, log to console
    if (import.meta.env.DEV) {
      console.log('[AUDIT]', entry);
    }
  }

  private sanitizeParameters(params: Record<string, any>): Record<string, any> {
    const sanitized = { ...params };
    // Remove sensitive data
    delete sanitized.apiKey;
    delete sanitized.fileContent;
    // Truncate large strings
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 200) {
        sanitized[key] = sanitized[key].substring(0, 200) + '...';
      }
    });
    return sanitized;
  }

  private sanitizeResult(result: any): any {
    if (typeof result === 'string' && result.length > 500) {
      return result.substring(0, 500) + '...';
    }
    return result;
  }

  getLogs(limit = 100): AuditEntry[] {
    return this.logs.slice(-limit);
  }

  getStats() {
    const total = this.logs.length;
    const errors = this.logs.filter(l => l.error).length;
    const avgDuration = this.logs.reduce((sum, l) => sum + l.duration, 0) / total || 0;

    return {
      total,
      errors,
      successRate: total > 0 ? ((total - errors) / total * 100).toFixed(1) + '%' : '0%',
      avgDuration: Math.round(avgDuration) + 'ms'
    };
  }

  clear() {
    this.logs = [];
  }
}

export const auditLogger = new AuditLogger();