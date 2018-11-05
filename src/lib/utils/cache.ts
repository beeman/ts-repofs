/**
 * Add a new blob to a cache instance
 * @param {Cache} cache
 * @param {String} sha Used as key
 * @param {Blob} blob
 * @return {Cache}
 */
export function addBlob(cache, sha, blob) {
  const blobs = cache.getBlobs()
  const newBlobs = blobs.set(sha, blob)

  const newCache = cache.set('blobs', newBlobs)
  return newCache
}
