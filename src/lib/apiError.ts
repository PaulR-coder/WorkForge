type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'CONFLICT'
  | 'AI_UNAVAILABLE'
  | 'AI_LIMIT_REACHED'
  | 'INTERNAL_ERROR'
  | 'BAD_REQUEST'
  | 'LOCKED'

function autoCode(status: number): ErrorCode {
  switch (status) {
    case 400: return 'BAD_REQUEST'
    case 401: return 'UNAUTHORIZED'
    case 403: return 'FORBIDDEN'
    case 404: return 'NOT_FOUND'
    case 409: return 'CONFLICT'
    case 423: return 'LOCKED'
    case 429: return 'RATE_LIMITED'
    case 503: return 'AI_UNAVAILABLE'
    default:  return 'INTERNAL_ERROR'
  }
}

export function apiError(message: string, status: number, code?: ErrorCode, extra?: Record<string, unknown>): Response {
  return Response.json({ error: message, code: code ?? autoCode(status), ...extra }, { status })
}
