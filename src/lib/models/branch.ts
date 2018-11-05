import { Record } from 'immutable'

import { Commit } from './commit'

const DEFAULTS = {
  // Such as 'master'
  name: '',
  // Pointing commit
  commit: new Commit(),
  // Potential remote name such as 'origin'. Empty for no remote
  remote: '',
}

export class Branch extends Record(DEFAULTS) {
  // ---- Properties Getter ----

  get sha() {
    return this.commit.sha
  }

  // ---- Static ----

  public static encode(branch) {
    return {
      name: branch.name,
      remote: branch.remote,
      commit: Commit.encode(branch.commit),
    }
  }

  public static decode(json) {
    const { name, remote, commit } = json

    return new Branch({
      name,
      remote,
      commit: Commit.decode(commit),
    })
  }
  public commit: any
  public name: string | any
  public remote: any

  /**
   * Returns the full name for the branch, such as 'origin/master'
   * This is used as key and should be unique
   */
  public getFullName() {
    if (this.isRemote()) {
      return `${this.remote}/${this.name}`
    } else {
      return this.name
    }
  }

  public getRemote() {
    return this.get('remote')
  }

  public isRemote() {
    return this.remote !== ''
  }

  public getName() {
    return this.get('name')
  }

  public getSha() {
    return this.sha
  }

  public setRemote(name) {
    return this.set('remote', name)
  }
}
