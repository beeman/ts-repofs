import { List, Map, Record } from 'immutable'

import modifyValues from 'modify-values'

import { branchName } from '../utils/normalize'
import { Branch } from './branch'
import { Cache } from './cache'
import { WorkingState } from './workingState'

const DEFAULTS = {
  currentBranchName: null, // Current branch full name
  workingStates: Map(), // Map<String, WorkingState> indexed by local branch fullnames
  branches: List(), // List<Branch>
  cache: new Cache(),
}

/**
 * Repository represents a map of WorkingTree with a current active
 * one
 * @type {Class}
 */
export class RepositoryState extends Record(DEFAULTS) {
  public static encode: (
    repoState,
  ) => { currentBranchName: any; workingStates: any; branches: any }
  public static decode: (json) => RepositoryState
  public static createEmpty: () => RepositoryState = () => {
    return new RepositoryState()
  }

  // ---- Properties Getter ----

  /**
   * @return {String} Current branch fullname
   */
  public getCurrentBranchName() {
    return this.get('currentBranchName')
  }

  public getWorkingStates() {
    return this.get('workingStates')
  }

  public getBranches() {
    return this.get('branches')
  }

  public getCache() {
    return this.get('cache')
  }

  // ---- Methods ----

  /**
   * Return a branch by its name
   * @param {String}
   * @return {Branch | Null}
   */
  public getBranch(branchName) {
    const branch = this.getBranches().find(branch => {
      return branchName === branch.getFullName()
    })
    return branch || null
  }

  /**
   * Return all local branches
   * @return {List<Branch>}
   */
  public getLocalBranches() {
    return this.getBranches().filter(function onlyLocal(branch) {
      return !branch.isRemote()
    })
  }

  /**
   * Return current active branch
   * @return {Branch | Null}
   */
  public getCurrentBranch() {
    return this.getBranch(this.getCurrentBranchName())
  }

  /**
   * Return working state for the current branch
   * @return {WorkingState}
   */
  public getCurrentState() {
    const currentBranch = this.getCurrentBranch()
    if (currentBranch === null) {
      return WorkingState.createEmpty()
    } else {
      return this.getWorkingStateForBranch(currentBranch)
    }
  }

  /**
   * Returns working state for given branch
   * @param {Branch}
   * @return {WorkingState | Null}
   */
  public getWorkingStateForBranch(branch) {
    const states = this.getWorkingStates()
    return states.get(branch.getFullName()) || null
  }

  /**
   * Check if a branch exists with the given name
   * @param {String} fullname Such as 'origin/master' or 'develop'
   */
  public hasBranch(fullname) {
    return this.getBranches().some(branch => {
      return branch.getFullName() === fullname
    })
  }

  /**
   * Check that a branch has been fetched
   * @param {Branch}
   */
  public isFetched(branch) {
    return this.getWorkingStates().has(branch.getFullName())
  }

  /**
   * @param {Branch | String} name Branch to update
   * @param {Branch | Null} value New branch value, null to delete
   */
  public updateBranch(name, value) {
    name = branchName(name)

    let branches = this.getBranches()
    const index = branches.findIndex(branch => {
      return branch.getFullName() === name
    })
    if (value === null) {
      // Delete
      branches = branches.remove(index)
    } else {
      // Update
      branches = branches.set(index, value)
    }
    return this.set('branches', branches)
  }
}

// ---- Statics ----

/**
 * Creates a new empty WorkingTree
 */
RepositoryState.createEmpty = function createEmpty() {
  return new RepositoryState({})
}

/**
 * Encodes a RepositoryState as a JSON object
 * @param {RepositoryState}
 * @return {Object} As plain JS
 */
RepositoryState.encode = function(repoState) {
  return {
    currentBranchName: repoState.get('currentBranchName'),
    workingStates: repoState
      .get('workingStates')
      .map(WorkingState.encode)
      .toJS(),
    branches: repoState
      .get('branches')
      .map(Branch.encode)
      .toJS(),
  }
}

RepositoryState.decode = function(json) {
  const workingStates = Map(
    modifyValues(json.workingStates, WorkingState.decode),
  )
  const branches = List(json.branches.map(Branch.decode))

  return new RepositoryState({
    currentBranchName: json.currentBranchName,
    workingStates,
    branches,
  })
}
