import { Map, OrderedMap, Record } from 'immutable'

import modifyValues from 'modify-values'

import { TreeEntry } from './treeEntry'

import { Change } from './change'

const DEFAULTS = {
  head: String(), // SHA
  treeEntries: Map(), // Map<Path, TreeEntry>
  changes: OrderedMap(), // OrderedMap<Path, Change>
}

/**
 * @type {Class}
 */
export class WorkingState extends Record(DEFAULTS) {
  // ---- Statics ----

  /**
   * Create a new empty WorkingState
   */
  public static createEmpty() {
    return new WorkingState({})
  }

  /**
   * Create a clean WorkingState from a head SHA and a map of tree entries
   * @param {SHA} head
   * @param {Map<Path, TreeEntry>} treeEntries
   * @return {WorkingState}
   */
  public static createWithTree(head, treeEntries) {
    return new WorkingState({
      head,
      treeEntries,
    })
  }

  public static encode(workingState) {
    return {
      head: workingState.get('head'),
      treeEntries: workingState
        .get('treeEntries')
        .map(TreeEntry.encode)
        .toJS(),
      changes: workingState
        .get('changes')
        .map(Change.encode)
        .toJS(),
    }
  }

  public static decode(json) {
    const treeEntries = Map(modifyValues(json.treeEntries, TreeEntry.decode))
    const changes = OrderedMap(modifyValues(json.changes, Change.decode))

    return new WorkingState({
      head: json.head,
      treeEntries,
      changes,
    })
  }
  // ---- Properties Getter ----

  public getTreeEntries() {
    return this.get('treeEntries')
  }

  public getChanges() {
    return this.get('changes')
  }

  public getHead() {
    return this.get('head')
  }

  // ---- Methods ----

  /**
   * Return true if working directory has no changes
   */
  public isClean() {
    return this.getChanges().size === 0
  }

  /**
   * Return a change for a specific path
   * @return {Change}
   */
  public getChange(filePath) {
    const changes = this.getChanges()
    return changes.get(filePath)
  }

  /**
   * Return this working state as clean.
   * @return {WorkingState}
   */
  public asClean() {
    return this.set('changes', OrderedMap())
  }
}
