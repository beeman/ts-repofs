import * as Q from 'q'

import { addBlob } from './cache'

/**
 * Get a blob from cache
 * @param {SHA} sha
 * @return {Blob}
 */
export function read(repoState, sha) {
  return repoState.getCache().getBlob(sha)
}

/**
 * Fetch a blob from SHA.
 * @param {RepositoryState} repoState
 * @param {Driver} driver
 * @param {SHA} sha
 * @return {Promise<RepositoryState>}
 */
export function fetchBlob(repoState, driver, sha) {
  if (isFetchedBlob(repoState, sha)) {
    // No op if already fetched
    return Q(repoState)
  }

  const cache = repoState.getCache()
  // Fetch the blob
  return (
    driver
      .fetchBlob(sha)
      // Then store it in the cache
      .then(blob => {
        const newCache = addBlob(cache, sha, blob)
        return repoState.set('cache', newCache)
      })
  )
}

/**
 * @param {RepositoryState} repoState
 * @param {SHA} sha
 * @return {Boolean} True if a the corresponding blob is in cache.
 */
export function isFetchedBlob(repoState, sha) {
  return repoState
    .getCache()
    .getBlobs()
    .has(sha)
}
