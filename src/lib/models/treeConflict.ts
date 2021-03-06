import { Map, Record } from 'immutable'
import { WorkingState } from './workingState'

const DEFAULTS = {
  base: WorkingState.createEmpty(),
  head: WorkingState.createEmpty(),
  // Nearest parent
  parent: WorkingState.createEmpty(),

  // Map<Path, Conflict>
  conflicts: Map(),
}

/**
 * A TreeConflict represents a comparison between two Git Trees
 * @type {Class}
 */
export class TreeConflict extends Record(DEFAULTS) {
  public static STATUS: {
    IDENTICAL: string
    DIVERGED: string
    AHEAD: string
    BEHIND: string
  }
  // ---- Properties Getter ----

  public getBase() {
    return this.get('base')
  }

  public getHead() {
    return this.get('head')
  }

  public getParent() {
    return this.get('parent')
  }

  public getConflicts() {
    return this.get('conflicts')
  }

  // ---- Methods ----

  /**
   * Returns the status of the tree conflict. Possible values are
   * described in TreeConflict.STATUS.
   */
  public getStatus() {
    const base = this.getBase().getHead()
    const head = this.getHead().getHead()
    const parent = this.getParent().getHead()

    if (base === head) {
      return TreeConflict.STATUS.IDENTICAL
    } else if (base === parent) {
      return TreeConflict.STATUS.AHEAD
    } else if (head === parent) {
      return TreeConflict.STATUS.BEHIND
    } else {
      return TreeConflict.STATUS.DIVERGED
    }
  }
}

// ---- Static ----

TreeConflict.STATUS = {
  // Both trees are identical
  IDENTICAL: 'identical',
  // They both diverged from a common parent
  DIVERGED: 'diverged',
  // Base is a parent of head
  AHEAD: 'ahead',
  // Head is a parent of base
  BEHIND: 'behind',
}
