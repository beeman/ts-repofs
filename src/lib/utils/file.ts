import * as Q from 'q'

import { FILE } from '../constants/filetype'

import { Change } from '../models/change'
import { File } from '../models/file'

import { fetchBlob, isFetchedBlob } from './blob'
import { ChangeUtils } from './change'
import { error } from './error'
import { findSha, getMergedTreeEntries } from './working'

/**
 * Fetch a file blob. Required for content access with
 * stat/read. No-op if the file is already fetched.
 * @param {RepositoryState} repoState
 * @param {Driver} driver
 * @param {Path} filepath
 * @return {Promise<RepositoryState>}
 */
export function fetchFile(repoState, driver, filepath) {
  if (isFetchedFile(repoState, filepath)) {
    // No op if already fetched
    return Q(repoState)
  }

  const workingState = repoState.getCurrentState()
  const blobSha = findSha(workingState, filepath)

  return fetchBlob(repoState, driver, blobSha)
}

/**
 * @param {RepositoryState} repoState
 * @param {Path} filepath
 * @return {Boolean} True if the file's content is in cache
 */
export function isFetchedFile(repoState, filepath) {
  const workingState = repoState.getCurrentState()
  const blobSha = findSha(workingState, filepath)
  // If sha is null then there are changes (those which are stored
  // and need not be fetched)
  return blobSha === null || isFetchedBlob(repoState, blobSha)
}

/**
 * Stat details about a file.
 * @param {RepositoryState} repoState
 * @param {Path} filepath
 * @return {File}
 */
export function statFile(repoState, filepath) {
  const workingState = repoState.getCurrentState()

  // Lookup potential changes
  const change = workingState.getChanges().get(filepath)
  // Lookup file entry
  const treeEntry = workingState.getTreeEntries().get(filepath)

  // Determine SHA of the blob
  let blobSHA
  if (change) {
    blobSHA = change.getSha()
  } else {
    blobSHA = treeEntry.getSha()
  }

  // Get the blob from change or cache
  let blob
  if (blobSHA) {
    // Get content from cache
    blob = repoState.getCache().getBlob(blobSHA)
  } else {
    // No sha, so it must be in changes
    blob = change.getContent()
  }

  let fileSize
  if (blob) {
    fileSize = blob.getByteLength()
  } else {
    // It might have been moved (but not fetched)
    const originalEntry = workingState.getTreeEntries().find(entry => {
      return entry.getSha() === blobSHA
    })
    fileSize = originalEntry.getBlobSize()
  }

  return new File({
    type: FILE,
    fileSize,
    path: filepath,
    content: blob,
  })
}

/**
 * Read content of a file
 * @param {Path} filepath
 * @return {Blob}
 */
export function readFile(repoState, filepath) {
  const file = statFile(repoState, filepath)
  return file.getContent()
}

/**
 * Read content of a file, returns a String
 * @return {String}
 */
export function readAsString(repoState, filepath, encoding) {
  const blob = readFile(repoState, filepath)
  return blob.getAsString(encoding)
}

/**
 * Return true if file exists in working tree, false otherwise
 */
export function existsFile(repoState, filepath) {
  const workingState = repoState.getCurrentState()
  const mergedFileSet = getMergedTreeEntries(workingState)

  return mergedFileSet.has(filepath)
}

/**
 * Create a new file (must not exists already)
 * @param {RepositoryState} repoState
 * @param {Path} filepath
 * @param {String} [content='']
 * @return {RepositoryState}
 */
export function createFile(repoState, filepath, content) {
  content = content || ''
  if (existsFile(repoState, filepath)) {
    throw error.fileAlreadyExist(filepath)
  }
  const change = Change.createCreate(content)
  return ChangeUtils.setChange(repoState, filepath, change)
}

/**
 * Write a file (must exists)
 * @return {RepositoryState}
 */
export function writeFile(repoState, filepath, content) {
  if (!existsFile(repoState, filepath)) {
    throw error.fileNotFound(filepath)
  }

  const change = Change.createUpdate(content)
  return ChangeUtils.setChange(repoState, filepath, change)
}

/**
 * Remove a file
 * @return {RepositoryState}
 */
export function removeFile(repoState, filepath) {
  if (!existsFile(repoState, filepath)) {
    throw error.fileNotFound(filepath)
  }

  const change = Change.createRemove()
  return ChangeUtils.setChange(repoState, filepath, change)
}

/**
 * Rename a file
 * @return {RepositoryState}
 */
export function moveFile(repoState, filepath, newFilepath) {
  if (filepath === newFilepath) {
    return repoState
  }

  const initialWorkingState = repoState.getCurrentState()

  // Create new file, with Sha if possible
  const sha = findSha(initialWorkingState, filepath)
  let changeNewFile
  if (sha) {
    changeNewFile = Change.createCreateFromSha(sha)
  } else {
    // Content not available as blob
    const blob = readFile(repoState, filepath)
    const contentBuffer = blob.getAsBuffer()
    changeNewFile = Change.createCreate(contentBuffer)
  }

  // Remove old file
  const removedRepoState = removeFile(repoState, filepath)
  // Add new file
  return ChangeUtils.setChange(removedRepoState, newFilepath, changeNewFile)
}

/**
 * Returns true if the given file has the same content in both
 * RepositoryState's current working state, or is absent from both.
 * @param {RepositoryState} previousState
 * @param {RepositoryState} newState
 * @param {Path} filepath
 * @return {Boolean}
 */
export function hasChangedFile(previousState, newState, filepath) {
  const previouslyExists = existsFile(previousState, filepath)
  const newExists = existsFile(newState, filepath)
  if (!previouslyExists && !newExists) {
    // Still non existing
    return false
  } else if (
    existsFile(previousState, filepath) !== existsFile(newState, filepath)
  ) {
    // The file is absent from one
    return true
  } else {
    // Both files exist
    const prevWorking = previousState.getCurrentState()
    const newWorking = newState.getCurrentState()

    const prevSha = findSha(prevWorking, filepath)
    const newSha = findSha(newWorking, filepath)
    if (prevSha === null && newSha === null) {
      // Both have are in pending changes. We can compare their contents
      return (
        readFile(previousState, filepath).getAsString() !==
        readFile(newState, filepath).getAsString()
      )
    } else {
      // Content changed if Shas are different, or one of them is null
      return prevSha !== newSha
    }
  }
}
