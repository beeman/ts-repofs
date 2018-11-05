// These codes are meant to be exported, for dev to react to runtime
// errors.
// We will always throw Errors with these values as code property.
export const ERRORS = {
  ALREADY_EXIST: '302 Already exist',
  AUTHENTICATION_FAILED: '401 Authentication Failed',
  BLOB_TOO_BIG: '507 Blog too large',
  CONFLICT: '409 Conflict',
  NOT_FAST_FORWARD: '433 Not fast forward',
  NOT_FOUND: '404 Not found',
  REF_NOT_FOUND: '404 Reference not found',
  UNKNOWN_REMOTE: '404 Unknown Remote',
}
// TODO drop HTTP codes completely, for more reliable error checking (no collision)
