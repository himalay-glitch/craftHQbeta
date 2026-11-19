export interface LoginRequestBody {
  email: string;
  password: string;
}

/** Error payload returned by POST /api/auth/login on a non-2xx response. */
export interface LoginErrorBody {
  error?: string;
  /** Present on 429 responses. */
  retry_after_seconds?: number;
}
