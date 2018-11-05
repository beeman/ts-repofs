import { Record } from 'immutable'

/**
 * Represents a file in a compare.
 */

const STATUS = {
  MODIFIED: 'modified',
  ADDED: 'added',
  REMOVED: 'removed',
}

const DEFAULTS = {
  sha: String(),
  filename: String(),
  status: String(STATUS.ADDED),
  additions: Number(0),
  deletions: Number(0),
  changes: Number(0),
  patch: String(),
}

/**
 * @type {Class}
 */
export class FileDiff extends Record(DEFAULTS) {
  /**
   * @return {FileDiff}
   */
  public static create(opts) {
    if (opts instanceof FileDiff) {
      return opts
    }

    return new FileDiff(opts)
  }
}
