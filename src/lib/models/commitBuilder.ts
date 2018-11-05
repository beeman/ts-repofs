import { List, Map, Record } from 'immutable'

import { Author } from './author'

const DEFAULTS = {
  // Commiter / Author
  committer: new Author(),
  author: new Author(),

  // Message for the commit
  message: String(),

  // Does the commit bring any modification ?
  empty: true,

  // Parents
  parents: List(), // List<SHA>

  // Tree entries
  treeEntries: Map(), // Map<Path, TreeEntry>

  // New blobs to create
  blobs: Map(), // Map<Path, Blob>
}

/**
 * CommitBuilder instance are created before creating the new commit
 * using the driver.
 *
 * @type {Class}
 */
export class CommitBuilder extends Record(DEFAULTS) {
  public static create: (opts) => CommitBuilder
  public getMessage() {
    return this.get('message')
  }

  public getParents() {
    return this.get('parents')
  }

  public getAuthor() {
    return this.get('author')
  }

  public getTreeEntries() {
    return this.get('treeEntries')
  }

  public getBlobs() {
    return this.get('blobs')
  }

  public getCommitter() {
    return this.get('committer')
  }

  /**
   * Returns true if the commit does not contain any change.
   */
  public isEmpty() {
    return this.get('empty')
  }
}

// ---- Statics

/**
 * Create a commit builder from a definition
 * @return {CommitBuilder}
 */
CommitBuilder.create = function(opts) {
  opts.committer = opts.committer || opts.author
  return new CommitBuilder(opts)
}
