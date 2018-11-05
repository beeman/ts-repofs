import { OrderedMap, Record } from 'immutable'

const DEFAULTS = {
  blobs: OrderedMap(), // OrderedMap<SHA, Blob>
}

export class Cache extends Record(DEFAULTS) {
  // ---- Properties Getter ----
  public getBlobs() {
    return this.get('blobs')
  }

  // ---- Methods ----

  /**
   * Return blob content
   */
  public getBlob(blobSHA) {
    const blobs = this.getBlobs()
    return blobs.get(blobSHA)
  }
}
