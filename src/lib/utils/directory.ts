import { join, relative } from 'path'

import flatten from 'array-flatten'
import * as uniqueBy from 'unique-by'
import { DIRECTORY, FILE } from '../constants/filetype'
import { File } from '../models/file'
import { TreeEntry } from '../models/treeEntry'
import { moveFile, removeFile } from './file'
import { contains, normPath } from './path'
import { getMergedFileSet, getMergedTreeEntries } from './working'

/**
 * List files in a directory (shallow)
 * @param {RepositoryState} repoState
 * @param {Path} dirName
 * @return {Array<File>}
 */
export function readDirectory(repoState, dirName) {
  dirName = normPath(dirName)

  const workingState = repoState.getCurrentState()
  const changes = workingState.getChanges()
  const treeEntries = getMergedTreeEntries(workingState)

  const files: any[] = []

  treeEntries.forEach((treeEntry, filepath) => {
    // Ignore git submodules
    if (treeEntry.getType() !== TreeEntry.TYPES.BLOB) {
      return
    }
    if (!contains(dirName, filepath)) {
      return
    }

    const innerPath = normPath(filepath.replace(dirName, ''))
    const isDirectory = innerPath.indexOf('/') >= 0
    // Make it shallow
    const name = innerPath.split('/')[0]

    const file = new File({
      path: join(dirName, name),
      type: isDirectory ? DIRECTORY : FILE,
      change: changes.get(filepath),
      fileSize: treeEntry.blobSize,
    })

    files.push(file)
  })

  // Remove duplicate from entries within directories
  return uniqueBy(files, file => {
    return file.getName()
  })
}

/**
 * List files and directories in a directory (recursive).
 * Warning: This recursive implementation is very costly.
 * @param {RepositoryState} repoState
 * @param {Path} dirName
 * @return {Array<File>}
 */
export function readRecursive(repoState, dirName) {
  // TODO improve performance and don't use .read() directly
  const files = readDirectory(repoState, dirName)

  let filesInDirs = files
    .filter(file => {
      return file.isDirectory()
    })
    .map(dir => {
      return readRecursive(repoState, dir.path)
    })

  filesInDirs = flatten(filesInDirs)

  return Array.prototype.concat(files, filesInDirs)
}

/**
 * List files in a directory (shallow)
 * @param {RepositoryState} repoState
 * @param {Path} dirName
 * @return {Array<Path>}
 */
export function readFilenames(repoState, dirName) {
  const files = readDirectory(repoState, dirName)

  return files.map(file => {
    return file.getPath()
  })
}

/**
 * List files recursively in a directory
 * @param {RepositoryState} repoState
 * @param {Path} dirName
 * @return {Array<Path>}
 */
export function readFilenamesRecursive(repoState, dirName) {
  dirName = normPath(dirName)

  const workingState = repoState.getCurrentState()
  const fileSet = getMergedFileSet(workingState)

  return fileSet
    .filter(path => {
      return contains(dirName, path)
    })
    .toArray()
}

/**
 * Rename a directory
 */
export function move(repoState, dirName, newDirName) {
  // List entries to move
  const filesToMove = readFilenamesRecursive(repoState, dirName)

  // Push change to remove all entries
  return filesToMove.reduce((repoState, oldPath: any) => {
    const newPath = join(newDirName, relative(dirName, oldPath))

    return moveFile(repoState, oldPath, newPath)
  }, repoState)
}

/**
 * Remove a directory: push REMOVE changes for all entries in the directory
 */
export function remove(repoState, dirName) {
  // List entries to move
  const filesToRemove = readFilenamesRecursive(repoState, dirName)

  // Push change to remove all entries
  return filesToRemove.reduce((repoState, path) => {
    return removeFile(repoState, path)
  }, repoState)
}
