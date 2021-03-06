import * as Q from 'q'

import { is, List, Map, Set } from 'immutable'
import { Branch } from '../models/branch'
import { CommitBuilder } from '../models/commitBuilder'
import { Conflict } from '../models/conflict'
import { TreeConflict } from '../models/treeConflict'
import { TreeEntry } from '../models/treeEntry'
import { WorkingState } from '../models/workingState'

/**
 * Computes a TreeConflict between to tree references. Fetches the
 * trees from the repo. The list of conflicts is the minimal set of
 * conflicts.
 * @param {Driver} driver
 * @param {Branch | String} base A branch, branch name, or SHA
 * @param {Branch | String} head A branch, branch name, or SHA
 * @return {Promise<TreeConflict>}
 */
function compareRefs(driver, base, head) {
  const baseRef = base instanceof Branch ? base.getFullName() : base
  const headRef = head instanceof Branch ? head.getFullName() : head

  return driver
    .findParentCommit(baseRef, headRef)
    .then(parentCommit => {
      // There can be no parent commit
      return Q.all(
        [parentCommit ? parentCommit.getSha() : null, baseRef, headRef].map(
          ref => {
            return ref
              ? driver.fetchWorkingState(ref)
              : WorkingState.createEmpty()
          },
        ),
      )
    })
    .spread((parent, base, head) => {
      const conflicts = _compareTrees(
        parent.getTreeEntries(),
        base.getTreeEntries(),
        head.getTreeEntries(),
      )

      return new TreeConflict({
        base,
        head,
        parent,
        conflicts,
      })
    })
}

/**
 * Merge solved Conflicts back into a TreeConflict. Unsolved conflicts
 * default to keep base.
 * @param {TreeConflict} treeConflict
 * @param {Map<Path, Conflict>} solved
 * @return {TreeConflict}
 */
function solveTree(treeConflict, solved) {
  solved = treeConflict
    .getConflicts()
    .merge(solved)
    // Solve unresolved conflicts
    .map(function defaultSolve(conflict) {
      if (!conflict.isSolved()) {
        return conflict.keepBase()
      } else {
        return conflict
      }
    })
  return treeConflict.set('conflicts', solved)
}

/**
 * Create a merge commit builder
 * @param {TreeConflict} treeConflict The solved TreeConflict
 * @param {Array<SHA>} parents Parent commits
 * @param {Author} options.author
 * @param {String} [options.message='Merge commit']
 * @return {CommitBuilder}
 */
function mergeCommit(treeConflict, parents, options) {
  options = options || {}

  const opts: any = {}

  // Assume the commit is not empty
  opts.empty = false

  // Parent SHAs
  opts.parents = List(parents)

  opts.author = options.author
  opts.message = options.message || 'Merged commit'

  // Get the solved tree entries
  const solvedEntries = _getSolvedEntries(treeConflict)
  opts.treeEntries = solvedEntries

  // Create map of blobs that needs to be created
  const solvedConflicts = treeConflict.getConflicts()
  opts.blobs = solvedEntries
    .filter(treeEntry => {
      return !treeEntry.hasSha()
    })
    .map((treeEntry, path) => {
      return solvedConflicts.get(path).getSolvedContent()
    })

  return CommitBuilder.create(opts)
}

// ---- Auxiliaries ----

/**
 * @param {Map<Path, TreeEntry>} parentEntries
 * @param {Map<Path, TreeEntry>} baseEntries
 * @param {Map<Path, TreeEntry>} headEntries
 * @return {Map<Path, Conflict>} The minimal set of conflicts.
 */
function _compareTrees(parentEntries, baseEntries, headEntries) {
  const headDiff = _diffEntries(parentEntries, headEntries)
  const baseDiff = _diffEntries(parentEntries, baseEntries)

  // Conflicting paths are paths...
  // ... modified by both branches
  const headSet = Set.fromKeys(headDiff)
  const baseSet = Set.fromKeys(baseDiff)
  const conflictSet = headSet.intersect(baseSet).filter(filepath => {
    // ...in different manners
    return !is(headDiff.get(filepath), baseDiff.get(filepath))
  })

  // Create the map of Conflict
  return Map().withMutations(map => {
    return conflictSet.reduce((map, filepath) => {
      const shas = [parentEntries, baseEntries, headEntries].map(
        function getSha(entries) {
          if (!entries.has(filepath)) {
            return null
          }
          return entries.get(filepath).getSha() || null
        },
      )

      return map.set(filepath, Conflict.create.apply(undefined, shas))
    }, map)
  })
}

/**
 * @param {Map<Path, TreeEntry>} parent
 * @param {Map<Path, TreeEntry>} child
 * @return {Map<Path, TreeEntry | Null>} The set of Path that have
 * been modified by the child. Null entries mean deletion.
 */
function _diffEntries(parent, child) {
  const parentKeys = Set.fromKeys(parent)
  const childKeys = Set.fromKeys(child)
  const all = parentKeys.union(childKeys)

  const changes = all.filter(function hasChanged(path) {
    // Removed unchanged
    return !is(parent.get(path), child.get(path))
  })

  return Map().withMutations(map => {
    return changes.reduce((map, path) => {
      // Add new TreeEntry or null when deleted
      const treeEntry = child.get(path) || null
      return map.set(path, treeEntry)
    }, map)
  })
}

/**
 * Returns the final TreeEntries for a solved TreeConflict.
 * @param {TreeConflict} treeConflict
 * @return {Map<Path, TreeEntry>} Some TreeEntries have a null SHA
 * because of new solved content.
 */
function _getSolvedEntries(treeConflict) {
  const parentEntries = treeConflict.getParent().getTreeEntries()
  const baseEntries = treeConflict.getBase().getTreeEntries()
  const headEntries = treeConflict.getHead().getTreeEntries()

  const baseDiff = _diffEntries(parentEntries, baseEntries)
  const headDiff = _diffEntries(parentEntries, headEntries)

  const resolvedEntries = treeConflict.getConflicts().map(solvedConflict => {
    // Convert to TreeEntries (or null for deletion)
    if (solvedConflict.isDeleted()) {
      return null
    } else {
      return new TreeEntry({
        sha: solvedConflict.getSolvedSha() || null,
      })
    }
  })

  return (
    parentEntries
      .merge(baseDiff, headDiff, resolvedEntries)
      // Remove deleted entries
      .filter(function nonNull(entry) {
        return entry !== null
      })
  )
}

export const ConflictUtils = {
  solveTree,
  mergeCommit,
  compareRefs,
  // Exposed for testing purpose
  _diffEntries,
  _getSolvedEntries,
  _compareTrees,
}
