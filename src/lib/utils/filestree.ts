import { is, Seq } from 'immutable'
import { join, relative } from 'path'

import { File } from '../models/file'
import { readFilenamesRecursive } from './directory'
import { statFile } from './file'
import { TreeNode } from './treeNode'
import { getMergedFileSet } from './working'

/**
 * Utils to create tree structures for files.
 */

/**
 * Convert a filepath to a Seq<String> to use as key path
 * @param {Path} path
 * @return {Seq<String>}
 */
export function pathToKeySeq(path) {
  // Remove trailing '/' etc.
  path = join(path, '.')
  if (path === '.') {
    return Seq([])
  } else {
    return Seq(path.split('/'))
  }
}

/**
 * Find a node at the given path in a TreeNode of Files.
 * @param {TreeNode<File>} tree
 * @param {Path} path
 * @return {TreeNode<File> | Null} null if no found
 */
export function getInPath(tree, path) {
  return tree.getIn(pathToKeySeq(path))
}

/**
 * Generate a files tree from the current branch, taking pending changes into account.
 * @param {RepositoryState} repoState
 * @param {Path} [dir='.'] The directory to get the subtree from, default to root
 * @return {TreeNode<File>} The directory TreeNode with all its children
 */
export function get(repoState, dirPath) {
  // Remove trailing '/' etc.
  const normDirPath = join(dirPath, '.')
  const filepaths: any = readFilenamesRecursive(repoState, normDirPath)

  const tree = {
    value: File.createDir(normDirPath),
    children: {},
  }

  for (let i = 0; i < filepaths.length; i++) {
    const relativePath = relative(normDirPath, filepaths[i])
    const parts = relativePath.split('/')
    let node = tree
    let prefix = normDirPath
    for (let j = 0; j < parts.length; j++) {
      const head = parts[j]
      const isLeaf = j === parts.length - 1
      prefix = join(prefix, head)

      // Create node if doesn't exist
      if (!node.children[head]) {
        if (isLeaf) {
          node.children[head] = {
            value: statFile(repoState, filepaths[i]),
          }
        } else {
          node.children[head] = {
            value: File.createDir(prefix),
            children: {},
          }
        }
      }
      node = node.children[head]
    }
  }

  return TreeNode.fromJS(tree)
}

/**
 * @param {RepositoryState} previousRepo
 * @param {RepositoryState} newRepo
 * @return {Boolean} True if the files structure changed.
 */
export function hasChanged(previousRepo, newRepo, dir) {
  const previousWorking = previousRepo.getCurrentState()
  const newWorking = newRepo.getCurrentState()

  const previousFiles = getMergedFileSet(previousWorking)
  const newFiles = getMergedFileSet(newWorking)

  return !is(previousFiles, newFiles)
}

export const TreeUtils = {
  TreeNode,
  get,
  getInPath,
  hasChanged,
}
