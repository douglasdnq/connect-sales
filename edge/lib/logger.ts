// Sistema de logs simples

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogContext {
  request_id?: string;
  platform?: string;
  event_type?: string;
  [key: string]: any;
}

class Logger {
  private requestId?: string;
  
  setRequestId(id: string) {
    this.requestId = id;
  }
  
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const logContext = {
      timestamp,
      level,
      message,
      request_id: this.requestId,
      ...context,
    };
    
    return JSON.stringify(logContext);
  }
  
  info(message: string, context?: LogContext) {
    console.log(this.formatMessage('info', message, context));
  }
  
  warn(message: string, context?: LogContext) {
    console.warn(this.formatMessage('warn', message, context));
  }
  
  error(message: string, context?: LogContext) {
    console.error(this.formatMessage('error', message, context));
  }
  
  debug(message: string, context?: LogContext) {
    if (process.env.DEBUG === 'true' || Deno?.env?.get('DEBUG') === 'true') {
      console.log(this.formatMessage('debug', message, context));
    }
  }
}

// Singleton
const logger = new Logger();

export default logger;

// Middleware para Edge Functions
export function logMiddleware(handler: Function) {
  return async (req: Request) => {
    const requestId = crypto.randomUUID();
    logger.setRequestId(requestId);
    
    const startTime = Date.now();
    const method = req.method;
    const url = new URL(req.url);
    
    logger.info('Request iniciada', {
      method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
    });
    
    try {
      const response = await handler(req);
      
      const duration = Date.now() - startTime;
      logger.info('Request concluída', {
        method,
        path: url.pathname,
        status: response.status,
        duration_ms: duration,
      });
      
      // Adiciona request ID no header da resposta
      const headers = new Headers(response.headers);
      headers.set('X-Request-Id', requestId);
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error('Request falhou', {
        method,
        path: url.pathname,
        error: error.message,
        stack: error.stack,
        duration_ms: duration,
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Internal Server Error',
          request_id: requestId,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-Id': requestId,
          },
        }
      );
    }
  };
}

// Helper para logs estruturados
export function createLogger(context: LogContext) {
  return {
    info: (message: string, additionalContext?: LogContext) => 
      logger.info(message, { ...context, ...additionalContext }),
    warn: (message: string, additionalContext?: LogContext) => 
      logger.warn(message, { ...context, ...additionalContext }),
    error: (message: string, additionalContext?: LogContext) => 
      logger.error(message, { ...context, ...additionalContext }),
    debug: (message: string, additionalContext?: LogContext) => 
      logger.debug(message, { ...context, ...additionalContext }),
  };
}