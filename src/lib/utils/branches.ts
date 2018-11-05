import { branchName } from './normalize'

import {
  checkout,
  fetchTree as fetchRepoTree,
  updateWorkingState,
} from './repo'

/**
 * Create a new branch with the given name.
 * @param {RepositoryState} repoState
 * @param {Driver} driver
 * @param {String} name
 * @param {Branch} [opts.base] Base branch, default to current branch
 * @param {Boolean} [opts.checkout=false] Directly fetch and checkout the branch
 * @return {Promise<RepositoryState>}
 */
function create(repositoryState, driver, name, opts: any = {}) {
  const {
    // Base branch for the new branch
    base = repositoryState.getCurrentBranch(),
    // Fetch the working state and switch to it ?
    checkout = true,
    // Drop changes from base branch the new working state ?
    clean = true,
    // Drop changes from the base branch ?
    cleanBase = false,
  } = opts

  let createdBranch

  return (
    driver
      .createBranch(base, name)
      // Update list of branches
      .then(branch => {
        createdBranch = branch
        let branches = repositoryState.getBranches()
        branches = branches.push(createdBranch)
        return repositoryState.set('branches', branches)
      })

      // Update working state or fetch it if needed
      .then(repoState => {
        let baseWk = repoState.getWorkingStateForBranch(base)

        if (!baseWk) {
          return checkout
            ? fetchRepoTree(repoState, driver, createdBranch)
            : repoState
        }

        // Reuse base WorkingState clean
        const headWk = clean ? baseWk.asClean() : baseWk
        repoState = updateWorkingState(repoState, createdBranch, headWk)

        // Clean base WorkingState
        baseWk = cleanBase ? baseWk.asClean() : baseWk
        repoState = updateWorkingState(repoState, base, baseWk)

        return repoState
      })

      // Checkout the branch
      .then(repoState => {
        if (!checkout) {
          return repoState
        }

        return checkout(repoState, createdBranch)
      })
  )
}

/**
 * Fetch the list of branches, and update the given branch only. Will update
 * the WorkingState of the branch (and discard previous
 * @param {RepositoryState} repoState
 * @param {Driver} driver
 * @param {Branch | String} name The branch to update
 * @return {Promise<RepositoryState>} with the branch updated
 */
function update(repoState, driver, name) {
  name = branchName(name || repoState.getCurrentBranch())

  return driver.fetchBranches().then(branches => {
    const newBranch = branches.find(branch => {
      return branch.getFullName() === name
    })

    if (!newBranch) {
      return repoState
    } else {
      return fetchRepoTree(repoState, driver, newBranch)
    }
  })
}

/**
 * Remove the given branch from the repository.
 * @param {RepositoryState} repoState
 * @param {Driver} driver
 * @param {Branch} branch to remove
 * @return {Promise<RepositoryState>}
 */
function remove(repoState, driver, branch) {
  return driver.deleteBranch(branch).then(() => {
    return repoState.updateBranch(branch, null)
  })
}

/**
 * Merge a branch/commit into a branch, and update that branch's tree.
 * @param {RepositoryState} repoState
 * @param {Driver} driver
 * @param {Branch | SHA} from The branch to merge from, or a commit SHA
 * @param {Branch} into The branch to merge into, receives the new
 * commit. Must be clean
 * @param {String} [options.message] Merge commit message
 * @param {Boolean} [options.fetch=true] Fetch the updated tree on `into` branch ?
 * @return {Promise<RepositoryState, ERRORS.CONFLICT>} Fails with
 * CONFLICT error if automatic merge is not possible
 */
function merge(repoState, driver, from, into, options: any = {}) {
  options = (Object as any).assign(
    {
      fetch: true,
    },
    options,
  )

  let updatedInto // closure

  return driver
    .merge(from, into, {
      message: options.message,
    }) // Can fail here with ERRORS.CONFLICT
    .then(function updateInto(mergeCommit) {
      if (!mergeCommit) {
        // Was a no op
        return repoState
      } else {
        updatedInto = into.merge({ commit: mergeCommit })
        repoState = repoState.updateBranch(into, updatedInto)
        // invalidate working state
        return updateWorkingState(repoState, into, null)
      }
    })
    .then(function fetchTree(repositoryState) {
      if (!options.fetch) {
        return repositoryState
      } else {
        return fetchRepoTree(repositoryState, driver, updatedInto)
      }
    })
}

export const BranchUtils = {
  remove,
  create,
  update,
  merge,
}
