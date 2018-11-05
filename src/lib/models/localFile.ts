import { Record } from 'immutable'

const DEFAULTS = {
  // Sha1 of the modified blob,
  sha: null,

  // Path of the file
  filename: '',

  // File status
  status: '',

  // Number of additions
  additions: 0,

  // Number of deletions
  deletions: 0,

  // Number of changes
  changes: 0,

  // Git patch to apply
  patch: '',
}

/**
 * LocalFile represents a status result
 * @type {Class}
 */
export class LocalFile extends Record(DEFAULTS) {
  public static create: (file) => LocalFile
  // ---- Properties Getter ----
  public getSha() {
    return this.get('sha')
  }

  public getFilename() {
    return this.get('filename')
  }

  public getStatus() {
    return this.get('status')
  }

  public getAdditions() {
    return this.get('additions')
  }

  public getDeletions() {
    return this.get('deletions')
  }

  public getChanges() {
    return this.get('changes')
  }

  public getPatch() {
    return this.get('patch')
  }
}

// /**
//  * Create a LocalFile representing a status result at the given path (filename etc.)
//  */
LocalFile.create = function(file) {
  return new LocalFile(file)
}
