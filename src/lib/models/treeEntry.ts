import { Record } from 'immutable'

const TYPES = {
  BLOB: 'blob',
  // tree: 'tree', we don't yet support this one
  COMMIT: 'commit',
}

const DEFAULTS = {
  // SHA of the corresponding blob
  sha: null, // String, null when content is not available as blob

  // Mode of the file
  mode: '100644',

  // Can be a 'tree', 'commit', or 'blob'
  type: TYPES.BLOB,

  // Size of the blob
  blobSize: 0,
}

/**
 * A TreeEntry represents an entry from the git tree (Tree).
 * @type {Class}
 */
export class TreeEntry extends Record(DEFAULTS) {
  public static TYPES: { BLOB: string; COMMIT: string }
  public static encode: (
    treeEntry,
  ) => { sha: any; type: string; mode: any; size: any }
  public static decode: (json) => TreeEntry

  // ---- Properties Getter ----
  public getBlobSize() {
    return this.get('blobSize')
  }

  public getMode() {
    return this.get('mode')
  }

  public getSha() {
    return this.get('sha')
  }

  public getType() {
    return this.get('type')
  }

  public hasSha() {
    return this.getSha() !== null
  }
}

// ---- Static ----

TreeEntry.encode = function(treeEntry) {
  return {
    sha: treeEntry.getSha(),
    type: treeEntry.getType(),
    mode: treeEntry.getMode(),
    size: treeEntry.getBlobSize(),
  }
}

TreeEntry.decode = function(json) {
  return new TreeEntry({
    sha: json.sha,
    type: json.type,
    mode: json.mode,
    blobSize: json.size,
  })
}

TreeEntry.TYPES = TYPES
