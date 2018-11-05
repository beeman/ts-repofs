import { Buffer } from 'buffer'

export function encode(s) {
  return new Buffer(s).toString('base64')
}

export function decode(s, encoding) {
  return new Buffer(s, 'base64').toString(encoding || 'utf8')
}
