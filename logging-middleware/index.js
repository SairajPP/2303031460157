export class Logger {
  constructor(serviceName = 'App') {
    // keeping it simple for now, might migrate to winston if we need file transports later
    this.serviceName = serviceName;
  }

  _formatMessage(level, message, meta) {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${this.serviceName}] [${level}] ${message}${metaStr}`;
  }

  info(message, meta = null) {
    console.info(`\x1b[36m${this._formatMessage('INFO', message, meta)}\x1b[0m`);
  }

  warn(message, meta = null) {
    console.warn(`\x1b[33m${this._formatMessage('WARN', message, meta)}\x1b[0m`);
  }

  error(message, meta = null) {
    console.error(`\x1b[31m${this._formatMessage('ERROR', message, meta)}\x1b[0m`);
  }

  debug(message, meta = null) {
    console.debug(`\x1b[90m${this._formatMessage('DEBUG', message, meta)}\x1b[0m`);
  }
}

// Express request logging middleware
// replaces those raw console.logs we had scattered everywhere
export const requestLogger = (req, res, next) => {
  const logger = new Logger('HTTP');
  const start = Date.now();
  
  // wait for the response to finish so we can grab the status code
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });

  next();
};
