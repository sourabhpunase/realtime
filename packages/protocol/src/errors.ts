export const ERROR_CODES = [
  "UNAUTHORIZED",
  "FORBIDDEN",
  "TOKEN_EXPIRED",
  "TOKEN_REVOKED",
  "WRONG_ROOM",
  "UNKNOWN_PERMISSION",
  "INVALID_PAYLOAD",
  "RATE_LIMITED",
  "PAYLOAD_TOO_LARGE",
  "ROOM_NOT_FOUND",
  "KEY_REVOKED",
  "PROTOCOL_MISMATCH",
  "CONFLICT",
  "INTERNAL",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export class RealtimeError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly requestId?: string;

  constructor(
    code: ErrorCode,
    message: string,
    status = 400,
    requestId?: string,
  ) {
    super(message);
    this.name = "RealtimeError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        requestId: this.requestId,
      },
    };
  }
}

export const STATUS_BY_CODE: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  TOKEN_EXPIRED: 401,
  TOKEN_REVOKED: 401,
  WRONG_ROOM: 403,
  UNKNOWN_PERMISSION: 400,
  INVALID_PAYLOAD: 400,
  RATE_LIMITED: 429,
  PAYLOAD_TOO_LARGE: 413,
  ROOM_NOT_FOUND: 404,
  KEY_REVOKED: 401,
  PROTOCOL_MISMATCH: 400,
  CONFLICT: 409,
  INTERNAL: 500,
};
