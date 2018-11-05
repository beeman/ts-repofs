import { CHANGE } from '../constants/changeType'

import { updateCurrentWorkingState } from './repo'

import { OrderedMap } from 'immutable'
import { contains } from './path'

/**
 * Returns the pending change of a file on the current branch
 * @param {RepositoryState} state
 * @param {Path} filepath
 * @return {Change | Null} Null if no change, or the file does not exist
 */
function getChange(state, filepath) {
  return (
    state
      .getCurrentState()
      .getChanges()
      .get(filepath) || null
  )
}

/**
 * Set a new change to the current WorkingState.
 * Attempt to resolve some cases like removing a file that was added
 * in the first place.
 * @param {RepositoryState}
 * @param {String}
 * @param {Change}
 */
function setChange(repoState, filepath, change) {
  let workingState = repoState.getCurrentState()
  let changes = workingState.getChanges()
  const type = change.getType()

  // Simplify change when possible
  if (type === CHANGE.REMOVE && !workingState.getTreeEntries().has(filepath)) {
    // Removing a file that did not exist before
    changes = changes.delete(filepath)
  } else if (
    type === CHANGE.CREATE &&
    workingState.getTreeEntries().has(filepath)
  ) {
    // Adding back a file that existed already
    changes = changes.set(filepath, change.set('type', CHANGE.UPDATE))
  } else {
    // Push changes to list
    changes = changes.set(filepath, change)
  }

  // Update workingState and repoState
  workingState = workingState.set('changes', changes)
  return updateCurrentWorkingState(repoState, workingState)
}

/**
 * Revert all changes
 * @param {RepositoryState}
 * @return {RepositoryState}
 */
export function revertAll(repoState) {
  let workingState = repoState.getCurrentState()

  // Create empty list of changes
  const changes = OrderedMap()

  // Update workingState and repoState
  workingState = workingState.set('changes', changes)
  return updateCurrentWorkingState(repoState, workingState)
}

/**
 * Revert change for a specific file
 * @param {RepositoryState}
 * @param {Path}
 * @return {RepositoryState}
 */
export function revertForFile(repoState, filePath) {
  let workingState = repoState.getCurrentState()

  // Remove file from changes map
  const changes = workingState.getChanges().delete(filePath)

  // Update workingState and repoState
  workingState = workingState.set('changes', changes)
  return updateCurrentWorkingState(repoState, workingState)
}

/**
 * Revert changes for a specific directory
 * @param {RepositoryState}
 * @param {Path}
 * @return {RepositoryState}
 */
export function revertForDir(repoState, dirPath) {
  let workingState = repoState.getCurrentState()
  let changes = workingState.getChanges()

  // Remove all changes that are in the directory
  changes = changes.filter((change, filePath) => {
    return !contains(dirPath, filePath)
  })

  // Update workingState and repoState
  workingState = workingState.set('changes', changes)
  return updateCurrentWorkingState(repoState, workingState)
}

/**
 * Revert all removed files
 * @param {RepositoryState}
 * @return {RepositoryState}
 */
export function revertAllRemoved(repoState) {
  let workingState = repoState.getCurrentState()
  const changes = workingState.getChanges().filter(
    // Remove all changes that are in the directory
    change => {
      return change.getType() === CHANGE.REMOVE
    },
  )

  // Update workingState and repoState
  workingState = workingState.set('changes', changes)
  return updateCurrentWorkingState(repoState, workingState)
}

export const ChangeUtils = {
  getChange,
  setChange,
  revertAll,
  revertForFile,
  revertForDir,
  revertAllRemoved,
}
