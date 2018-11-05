import { List, Record } from 'immutable'

import { Commit } from './commit'
import { FileDiff } from './fileDiff'

/**
 * Represents a comparison in the history.
 */

const DEFAULTS = {
  base: String(),
  head: String(),
  // Closest parent in the compare
  closest: new Commit(),
  // List of files modified with their SHA and patch.
  files: List(), // List<FileDiff>
  // List of commits in the range (List<Commit>)
  commits: List(),
}

/**
 * @type {Class}
 */
export class Comparison extends Record(DEFAULTS) {
  /**
   * @return {Commit}
   */
  public static create(opts) {
    if (opts instanceof Comparison) {
      return opts
    }

    return new Comparison({
      base: opts.base,
      head: opts.head,
      closest: Commit.create(opts.closest),
      files: List(opts.files).map(file => FileDiff.create(file)),
      commits: List(opts.commits).map(commit => Commit.create(commit)),
    })
  }
}
