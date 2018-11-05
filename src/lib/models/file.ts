import { Record } from 'immutable'
import * as mime from 'mime-types'
import { basename, extname } from 'path'

import { DIRECTORY, FILE } from '../constants/filetype'

const DEFAULTS = {
  // Size of the file. 0 if the file was not fetched
  fileSize: 0,

  // Content of the blob containing the file's content
  // Null if the file was not fetched
  content: null, // Blob

  // Path of the file
  path: '',

  // Type of entry (see constants/filetype.js)
  type: FILE,
  change: null,
}

/**
 * @type {Class}
 */
export class File extends Record(DEFAULTS) {
  public static createDir: (filepath) => File
  public static create: (filepath, fileSize) => File
  // ---- Properties Getter ----

  public getContent() {
    return this.get('content')
  }

  public getFileSize() {
    return this.get('fileSize')
  }

  public getPath() {
    return this.get('path')
  }

  public getType() {
    return this.get('type')
  }

  public isDirectory() {
    return this.getType() === DIRECTORY
  }

  public getMime() {
    return mime.lookup(extname(this.getPath())) || 'application/octet-stream'
  }

  public getName() {
    return basename(this.getPath())
  }
}

/**
 * Create a File representing a directory at the given path (empty content etc.).
 */
File.createDir = function(filepath) {
  return new File({
    path: filepath,
    type: DIRECTORY,
  })
}

/**
 * Create a File representing a directory at the given path (empty content etc.).
 */
File.create = function(filepath, fileSize) {
  return new File({
    path: filepath,
    fileSize: fileSize || 0,
    type: FILE,
  })
}
