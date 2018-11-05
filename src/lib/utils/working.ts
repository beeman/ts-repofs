import { Set } from 'immutable'

import { error } from './error'

import { TreeEntry } from '../models/treeEntry'

import { CHANGE } from '../constants/changeType'

/**
 * Returns a Seq of tree mixing changes and the fetched tree
 * @param {WorkingState}
 * @return {Set<Path>}
 */
export function getMergedFileSet(workingState): any {
  return Set.fromKeys(
    getMergedTreeEntries(workingState).filter(
      treeEntry => treeEntry.getType() === TreeEntry.TYPES.BLOB,
    ),
  )
}

/**
 * Returns a Map of TreeEntry, with sha null when the content is not available as sha.
 * @param {WorkingState}
 * @return {Map<TreeEntries>}
 */
export function getMergedTreeEntries(workingState): any {
  const removedOrModified = workingState.getChanges().groupBy(change => {
    return change.getType() === CHANGE.REMOVE ? 'remove' : 'modified'
  })

  const setToRemove = Set.fromKeys(removedOrModified.get('remove', []))

  const withoutRemoved = workingState.getTreeEntries().filter((_, path) => {
    return !setToRemove.contains(path)
  })

  const addedTreeEntries = removedOrModified
    .get('modified', [])
    .map(function toTreeEntry(change): any {
      return new TreeEntry({
        mode: '100644',
        sha: change.hasSha() ? change.getSha() : null,
      })
    })

  return withoutRemoved.concat(addedTreeEntries)
}

/**
 * Attempts to find a SHA if available for the  given file
 * @param {Path}
 * @return {Sha | Null} null if Sha cannot be retrieved (because of pending change)
 * @throws NOT_FOUND if the file does not exist or was removed
 */
export function findSha(workingState, filepath) {
  // Lookup potential changes
  const change = workingState.getChanges().get(filepath)
  // Else lookup tree
  const treeEntry = workingState.getTreeEntries().get(filepath)

  if (change) {
    if (change.getType() === CHANGE.REMOVE) {
      throw error.fileNotFound(filepath)
    } else {
      return change.getSha()
    }
  } else if (treeEntry) {
    return treeEntry.getSha()
  } else {
    throw error.fileNotFound(filepath)
  }
}

/**
 * Fetch tree for a branch (using its SHA) and return an clean WorkingState for it
 * @param {Driver} driver
 * @param {Branch} branch
 */
export function fetch(driver, branch) {
  // Fetch the tree
  return driver.fetchWorkingState(branch.getSha())
}

export const WorkingUtils = {
  getMergedFileSet,
  getMergedTreeEntries,
  fetch,
  findSha,
}
