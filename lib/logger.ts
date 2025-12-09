// SRE Logging utility for tracking navigation and errors
type LogLevel = "info" | "warn" | "error" | "debug"

interface LogEvent {
  timestamp: string
  level: LogLevel
  page: string
  event: string
  userId?: string
  role?: string
  data?: Record<string, any>
}

const LOG_PREFIX = "[EVA-SRE]"

function formatLog(event: LogEvent): string {
  return `${LOG_PREFIX} [${event.timestamp}] [${event.level.toUpperCase()}] [${event.page}] ${event.event}${
    event.data ? ` | Data: ${JSON.stringify(event.data)}` : ""
  }${event.userId ? ` | User: ${event.userId}` : ""}${event.role ? ` | Role: ${event.role}` : ""}`
}

export const logger = {
  // Page navigation tracking
  pageView: (page: string, userId?: string, role?: string, data?: Record<string, any>) => {
    const event: LogEvent = {
      timestamp: new Date().toISOString(),
      level: "info",
      page,
      event: "PAGE_VIEW",
      userId,
      role,
      data,
    }
    console.log(formatLog(event))
  },

  // Page load complete
  pageLoaded: (page: string, loadTimeMs: number, userId?: string, role?: string) => {
    const event: LogEvent = {
      timestamp: new Date().toISOString(),
      level: "info",
      page,
      event: "PAGE_LOADED",
      userId,
      role,
      data: { loadTimeMs },
    }
    console.log(formatLog(event))
  },

  // User action tracking
  action: (page: string, action: string, userId?: string, role?: string, data?: Record<string, any>) => {
    const event: LogEvent = {
      timestamp: new Date().toISOString(),
      level: "info",
      page,
      event: `ACTION: ${action}`,
      userId,
      role,
      data,
    }
    console.log(formatLog(event))
  },

  // Error tracking
  error: (page: string, error: string, errorDetails?: any, userId?: string, role?: string) => {
    const event: LogEvent = {
      timestamp: new Date().toISOString(),
      level: "error",
      page,
      event: `ERROR: ${error}`,
      userId,
      role,
      data: errorDetails ? { error: errorDetails?.message || errorDetails } : undefined,
    }
    console.error(formatLog(event))
  },

  // Warning tracking
  warn: (page: string, message: string, data?: Record<string, any>, userId?: string, role?: string) => {
    const event: LogEvent = {
      timestamp: new Date().toISOString(),
      level: "warn",
      page,
      event: `WARN: ${message}`,
      userId,
      role,
      data,
    }
    console.warn(formatLog(event))
  },

  // Debug tracking
  debug: (page: string, message: string, data?: Record<string, any>) => {
    const event: LogEvent = {
      timestamp: new Date().toISOString(),
      level: "debug",
      page,
      event: `DEBUG: ${message}`,
      data,
    }
    console.log(formatLog(event))
  },

  // Auth events
  auth: (
    event: "LOGIN" | "LOGOUT" | "SESSION_CHECK" | "SESSION_EXPIRED",
    userId?: string,
    role?: string,
    success?: boolean,
  ) => {
    const logEvent: LogEvent = {
      timestamp: new Date().toISOString(),
      level: success === false ? "warn" : "info",
      page: "AUTH",
      event: `AUTH_${event}`,
      userId,
      role,
      data: { success },
    }
    console.log(formatLog(logEvent))
  },

  // API/Data fetch events
  fetch: (page: string, resource: string, success: boolean, duration?: number, error?: string) => {
    const event: LogEvent = {
      timestamp: new Date().toISOString(),
      level: success ? "info" : "error",
      page,
      event: `FETCH: ${resource}`,
      data: { success, duration, error },
    }
    if (success) {
      console.log(formatLog(event))
    } else {
      console.error(formatLog(event))
    }
  },
}
