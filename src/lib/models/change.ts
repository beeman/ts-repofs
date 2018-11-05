import { Record } from 'immutable'

import { CHANGE } from '../constants/changeType'
import { Blob } from './blob'

const DEFAULTS = {
  type: CHANGE.UPDATE,
  // New content of the file (for a CREATE/UPDATE)
  content: new Blob(),
  // or sha of the origin (for a rename/move)
  sha: null, // String
}

/**
 * A Change represents a local modification, not yet commited.
 * @type {Class}
 */
export class Change extends Record(DEFAULTS) {
  // ---- Static ----

  /**
   * @param {Buffer | ArrayBuffer | String} content
   * @return {Change} CREATE with content and optional message
   */
  public static createCreate(content) {
    return new Change({
      type: CHANGE.CREATE,
      content: Blob.create(content),
    })
  }

  /**
   * @param {SHA} sha
   * @return {Change} CREATE with origin sha and optional message
   */
  public static createCreateFromSha(sha) {
    return new Change({
      type: CHANGE.CREATE,
      sha,
    })
  }

  /**
   * @param {Buffer | ArrayBuffer | String} content
   * @return {Change} UPDATE with content and optional message
   */
  public static createUpdate(content) {
    return new Change({
      type: CHANGE.UPDATE,
      content: Blob.create(content),
    })
  }

  /**
   * @return {Change} REMOVE with optional message
   */
  public static createRemove() {
    return new Change({
      type: CHANGE.REMOVE,
    })
  }

  public static encode(change) {
    return {
      type: change.get('type'),
      // Encode Blob as base64 string
      content: change.get('content').getAsString('base64'),
      sha: change.get('sha'),
    }
  }

  public static decode(json) {
    // Useless optimization to use the original String reference
    const type = CHANGE[json.type.toUpperCase()]

    if (!type) {
      throw new Error('Unrecognized change type')
    }

    const content = Blob.createFromBase64(json.content)

    return new Change({
      type,
      content,
      sha: json.sha,
    })
  }
  // ---- Properties Getter ----
  public getType() {
    return this.get('type')
  }

  public getSha() {
    return this.get('sha')
  }

  public hasSha() {
    return !!this.get('sha')
  }

  public getContent() {
    return this.get('content')
  }
}
