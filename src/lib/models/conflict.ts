import { Record } from 'immutable'

import { Blob } from './blob'
// Describe a change made on a reference, compared to its parent
const CHANGE = {
  ADDED: 'added',
  DELETED: 'deleted',
  IDENTICAL: 'identical',
  MODIFIED: 'modified',
}

// There is four types of conflicts depending on changes on each branch:
// |-----------+------------+-----------------+-----------+-----------------|
// | base\head | ADDED      | DELETED         | IDENTICAL | MODIFIED        |
// |-----------+------------+-----------------+-----------+-----------------|
// | ADDED     | Both added | X               | X         | X               |
// |-----------+------------+-----------------+-----------+-----------------|
// | DELETED   | X          | X               | X         | Deleted on base |
// |-----------+------------+-----------------+-----------+-----------------|
// | IDENTICAL | X          | X               | X         | X               |
// |-----------+------------+-----------------+-----------+-----------------|
// | MODIFIED  | X          | Deleted on head | X         | Both modified   |
// |-----------+------------+-----------------+-----------+-----------------|
const TYPE = {
  BOTH_ADDED: 'added',
  DELETED_BASE: 'deleted-base',
  DELETED_HEAD: 'deleted-head',
  BOTH_MODIFIED: 'modified',
  NO_CONFLICT: 'no-conflict',
}

const DEFAULTS = {
  // Blob SHA in head. Null when absent
  headSha: null, // String

  // Blob SHA in base. Null when absent
  baseSha: null, // String

  // Blob SHA in the closest parent. Null when absent
  parentSha: null, // String

  // Is solved ?
  solved: false,

  // The SHA it is solved with. null when using solvedContent, or to solve by
  // deleting the entry.
  solvedSha: null, // SHA

  // The solved content
  solvedContent: null, // Blob
}

/**
 * Conflict represents a git conflict.
 * @type {Class}
 */
export class Conflict extends Record(DEFAULTS) {
  public static create: (parentSha, baseSha, headSha) => Conflict
  public static TYPE: {
    BOTH_ADDED: string
    DELETED_BASE: string
    DELETED_HEAD: string
    BOTH_MODIFIED: string
    NO_CONFLICT: string
  }
  public static CHANGE: {
    ADDED: string
    DELETED: string
    IDENTICAL: string
    MODIFIED: string
  }
  // ---- Properties Getter ----

  public getBaseSha() {
    return this.get('baseSha')
  }

  public getHeadSha() {
    return this.get('headSha')
  }

  public getParentSha() {
    return this.get('parentSha')
  }

  public isSolved() {
    return this.get('solved')
  }

  public getSolvedSha() {
    return this.get('solvedSha')
  }

  public getSolvedContent() {
    return this.get('solvedContent')
  }

  // ---- Methods ----

  /**
   * @return {Boolean}
   */
  public isDeleted() {
    return (
      this.isSolved() &&
      this.getSolvedContent() === null &&
      this.getSolvedSha() === null
    )
  }

  /**
   * @return {Conflict.CHANGE} Return the kind of change made by base
   */
  public getBaseStatus() {
    return getChange(this.getParentSha(), this.getBaseSha())
  }

  /**
   * @return {Conflict.CHANGE} Return the kind of change made by head
   */
  public getHeadStatus() {
    return getChange(this.getParentSha(), this.getHeadSha())
  }

  /**
   * @return {Conflict.TYPE} Return the type of this conflict
   */
  public getType() {
    const base = this.getBaseStatus()
    const head = this.getHeadStatus()

    // Based on the TYPE matrix :
    if (base === CHANGE.ADDED && head === CHANGE.ADDED) {
      return TYPE.BOTH_ADDED
    } else if (base === CHANGE.DELETED && head === CHANGE.MODIFIED) {
      return TYPE.DELETED_BASE
    } else if (base === CHANGE.MODIFIED && head === CHANGE.DELETED) {
      return TYPE.DELETED_HEAD
    } else if (base === CHANGE.MODIFIED && head === CHANGE.MODIFIED) {
      return TYPE.BOTH_MODIFIED
    } else {
      return TYPE.NO_CONFLICT
    }
  }

  /**
   * @param {Boolean} [solved] Default to toggle
   * @return {Conflict} Set the solved state. Does not alter previous
   * solved content/sha
   */
  public toggleSolved(solved) {
    // toggle
    solved = solved === undefined ? !this.isSolved() : solved
    return this.merge({
      solved,
    })
  }

  /**
   * @param {String} sha
   * @return {Conflict}
   */
  public solveWithSha(sha) {
    return this.merge({
      solved: true,
      solvedSha: sha,
      solvedContent: null,
    })
  }

  /**
   * @param {Blob | String} content
   * @return {Conflict}
   */
  public solveWithContent(content) {
    const blob =
      content instanceof Blob ? content : Blob.createFromString(content)
    return this.merge({
      solved: true,
      solvedSha: null,
      solvedContent: blob,
    })
  }

  /**
   * @return {Conflict} Solved by removing the entry
   */
  public solveByDeletion() {
    return this.merge({
      solved: true,
      solvedSha: null,
      solvedContent: null,
    })
  }

  /**
   * @return {Conflict} Solved by keeping head's version
   */
  public keepHead(content) {
    return this.solveWithSha(this.getHeadSha())
  }

  /**
   * @return {Conflict} Solved by keeping base's version
   */
  public keepBase(content) {
    return this.solveWithSha(this.getBaseSha())
  }

  /**
   * @return {Conflict} Reset to unsolved state
   */
  public resetUnsolved() {
    return this.merge({
      solved: false,
      solvedSha: null,
      solvedContent: null,
    })
  }
}

// ---- Static ----

Conflict.create = function(parentSha, baseSha, headSha) {
  return new Conflict({
    parentSha,
    baseSha,
    headSha,
  })
}

// ---- utils ----

/**
 * @param {SHA | Null} parent
 * @param {SHA | Null} sha
 * @return {Conflict.CHANGE}
 */
export function getChange(parent, sha) {
  if (parent === sha) {
    return CHANGE.IDENTICAL
  } else if (parent === null) {
    return CHANGE.ADDED
  } else if (sha === null) {
    return CHANGE.DELETED
  } else {
    // Both are not null but different
    return CHANGE.MODIFIED
  }
}
Conflict.TYPE = TYPE
Conflict.CHANGE = CHANGE
