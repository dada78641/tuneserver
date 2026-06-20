// tuneserver <https://github.com/dada78641/tuneserver>
// © MIT License

export interface Logger {
  log: LogFunction
  info: LogFunction
  warn: LogFunction
  error: LogFunction
  setQuiet: (value: boolean) => void
}

export type LogMethod = 'log' | 'info' | 'warn' | 'error'

export interface LoggerOptions {
  identifier: string
  widget: string
  color1?: string
  color2?: string
  quiet?: boolean
}

export type LogFunction = {
  // You can pass in a custom template; otherwise, the template is "%o".
  (template: string, ...args: unknown[]): void
  (...args: unknown[]): void
}

/**
 * Returns a logger for use in a specific widget.
 */
export function createWidgetLogger(widget: string) {
  const logger = createLogger({
    identifier: 'TuneServer',
    widget,
    color1: '#58fae8',
    color2: '#53c1ff'
  })
  return logger
}

/**
 * Creates a logger object with identifier and color.
 * 
 * The object has log, warn and error methods and logs to console.
 */
export function createLogger(options: LoggerOptions): Logger {
  const {identifier, widget, color1 = 'unset', color2 = 'unset'} = options
  let quiet = options.quiet || false

  const setQuiet = (value: boolean) => {
    quiet = value
  }
  
  const createLogFunction = (method: LogMethod): LogFunction => {
    const style1 = `color:${color1};`
    const style2 = `color:${color2};`
    
    const logFunction = (...args: unknown[]) => {
      if (quiet) {
        return
      }
      let messageTemplate: string
      let values: unknown[] = args
      
      if (typeof args[0] === 'string') {
        messageTemplate = args[0] as string
        values = args.slice(1)
      }
      else {
        messageTemplate = '%o'
      }
      
      console[method](
        `%c[${identifier} %c${widget}%c]%c ${messageTemplate}`,
        style1,
        style2,
        style1,
        'color:unset;',
        ...values
      )
    }
    
    return logFunction as LogFunction
  }
  
  return {
    setQuiet,
    log: createLogFunction('log'),
    info: createLogFunction('info'),
    warn: createLogFunction('warn'),
    error: createLogFunction('error'),
  }
}
