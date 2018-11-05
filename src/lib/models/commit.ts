import { List, Record } from 'immutable'
import { Author } from './author'

import { FileDiff } from './fileDiff'

/**
 * Represents a Commit in the history (already created)
 */

const DEFAULTS = {
  // Message for the commit
  message: String(),
  // SHA of the commit
  sha: String(),
  // Author name
  author: new Author(),
  // String formatted date of the commit
  date: new Date(),
  // List of files modified with their SHA and patch.
  files: List(), // List<FileDiff>
  // Parents of the commit (List<SHA>)
  parents: List(),
}

/**
 * A Change represents a local modification, not yet commited.
 * @type {Class}
 */
export class Commit extends Record(DEFAULTS) {
  // ---- Statics

  /**
   * @param {SHA} opts.sha
   * @param {Array<SHA>} opts.parents
   * @param {String} [opts.message]
   * @param {String} [opts.date]
   * @param {Author} [opts.author]
   * @param {Array<JSON>} [opts.files] Modified files objects, as returned by the GitHub API
   * @return {Commit}
   */
  public static create(opts) {
    if (opts instanceof Commit) {
      return opts
    }

    return new Commit({
      sha: opts.sha,
      message: opts.message,
      author: Author.create(opts.author),
      date: new Date(opts.date),
      files: List(opts.files || []).map(file => FileDiff.create(file)),
      parents: List(opts.parents || []),
    })
  }

  public static encode(commit) {
    const { message, sha, date, author, parents } = commit

    return {
      message,
      sha,
      date,
      parents: parents.toJS(),
      author: Author.encode(author),
    }
  }

  public static decode(json) {
    return Commit.create(json)
  }
  public getMessage() {
    return this.get('message')
  }

  public getSha() {
    return this.get('sha')
  }

  public getAuthor() {
    return this.get('author')
  }

  public getDate() {
    return this.get('date')
  }

  public getFiles() {
    return this.get('files')
  }

  public getParents() {
    return this.get('parents')
  }
}
