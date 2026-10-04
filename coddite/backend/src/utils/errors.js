/**
 * Custom application error class to handle known HTTP errors gracefully.
 */
export class AppError extends Error {
  /**
   * @param {number} statusCode HTTP status code (e.g. 400, 401, 404)
   * @param {string} message Error message
   * @param {string} [code] Internal error code (e.g. 'VALIDATION_ERROR')
   * @param {any} [details] Additional error details
   */
  constructor(statusCode, message, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
