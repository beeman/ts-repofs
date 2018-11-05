import { Record } from 'immutable'

const DEFAULTS = {
  ref: '', // git reference as `refs/heads/master`,
  sha: '', // sha1 reference
}

export class Reference extends Record(DEFAULTS) {
  public getRef() {
    return this.get('ref')
  }

  public getSha() {
    return this.get('sha')
  }

  public getLocalBranchName() {
    const ref = this.get('ref')
    return localBranchName(ref)
  }

  public isLocalBranch(refstr) {
    return hasPrefix(refstr, 'refs/heads/')
  }
}

export function hasPrefix(str, prefix) {
  return str.indexOf(prefix) === 0
}

export function trimPrefix(str, prefix) {
  return hasPrefix(str, prefix) ? str.slice(prefix.length) : str
}

export function localBranchName(refstr) {
  return trimPrefix(refstr, 'refs/heads/')
}
