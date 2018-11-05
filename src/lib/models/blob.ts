import { Record } from 'immutable'

import {
  enforceArrayBuffer,
  enforceBuffer,
  enforceString,
  equals,
  fromBase64,
  fromBuffer,
  fromString,
} from '../utils/arraybuffer'
// Don't read blob over 1MB
const BLOB_MAX_SIZE = 1 * 1024 * 1024

const DEFAULTS = {
  // Size of the file
  byteLength: 0,
  // Content as a buffer
  content: fromString(''),
}

export class Blob extends Record(DEFAULTS) {
  // ---- Static ----

  /**
   * Create a blob from a string or buffer, returns null if blob is too big
   * @param  {String|Buffer|ArrayBuffer} buf
   * @return {?Blob}
   */
  public static create(buf) {
    if (buf instanceof Blob) {
      return buf
    }

    return Blob.createFromArrayBuffer(enforceArrayBuffer(buf))
  }

  /**
   * Create a blob from an array buffer, returns null if blob is too big
   * @param  {ArrayBuffer} buf
   * @return {?Blob}
   */
  public static createFromArrayBuffer(buf) {
    const isTooBig = buf.byteLength > BLOB_MAX_SIZE

    if (isTooBig) {
      const err = new Error('File content is too big to be processed')
      // err.code = ERRORS.BLOB_TOO_BIG;

      throw err
    }

    return new Blob({
      byteLength: buf.byteLength,
      content: buf,
    })
  }

  /**
   * Create a blob from a base64 string, returns null if blob is too big
   * @param  {String} content
   * @return {?Blob}
   */
  public static createFromBase64(content) {
    const buf = fromBase64(content)
    return Blob.createFromArrayBuffer(buf)
  }

  /**
   * Create a blob from a buffer, returns null if blob is too big
   * @param  {String} content
   * @return {?Blob}
   */
  public static createFromBuffer(content) {
    const buf = fromBuffer(content)
    return Blob.createFromArrayBuffer(buf)
  }

  /**
   * Create a blob from a string, returns null if blob is too big
   * @param  {String} content
   * @return {?Blob}
   */
  public static createFromString(content) {
    const buf = fromString(content)
    return Blob.createFromArrayBuffer(buf)
  }

  /**
   * Encode a blob to JSON
   * @param  {Blob} blob
   * @return {JSON}
   */
  public static encode(blob) {
    return {
      byteLength: blob.getByteLength(),
      content: blob.getAsBase64(),
    }
  }

  /**
   * Decode a blob from JSON
   * @param  {JSON} json
   * @return {Blob}
   */
  public static decode(json) {
    const properties: any = {}
    if (json.content) {
      properties.content = fromBase64(json.content)
    }
    properties.byteLength = json.byteLength

    return new Blob(properties)
  }
  // ---- Properties Getter ----
  public getByteLength() {
    return this.get('byteLength')
  }

  public getContent() {
    return this.get('content')
  }

  // ---- Methods ----

  /**
   * Return content as an ArrayBuffer
   */
  public getAsArrayBuffer() {
    return this.getContent()
  }

  /**
   * Return content as a base64 string
   */
  public getAsBase64() {
    console.log('toBase64 not implemented')
    // return toBase64(this.getContent());
  }

  /**
   * Return blob content as a string
   * @param {encoding}
   */
  public getAsString(encoding) {
    encoding = encoding || 'utf8'
    return enforceString(this.getContent(), encoding)
  }

  /**
   * @return {Buffer} the blob as Buffer
   */
  public getAsBuffer() {
    return enforceBuffer(this.getContent())
  }

  /**
   * Test equality to another Blob
   * @return {Boolean}
   */
  // TODO implement and use Blob.prototype.hashCode, since Immutable
  // will assume hashCodes are equals when equals returns true.
  public equals(blob) {
    return (
      this.getByteLength() === blob.getByteLength() &&
      equals(this.getContent(), blob.getContent())
    )
  }
}
