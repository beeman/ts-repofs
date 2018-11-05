import { normalize } from 'path'

/**
 * Normalize a path
 */
export function normPath(p) {
  p = normalize(p)
  if (p[0] === '/') {
    p = p.slice(1)
  }
  if (p[p.length - 1] === '/') {
    p = p.slice(0, -1)
  }
  if (p === '.') {
    p = ''
  }
  return p
}

/**
 * Returns true if the path is under dir
 */
export function contains(dir, path) {
  dir = dir ? normPath(dir) + '/' : dir
  path = normPath(path)

  return path.indexOf(dir) === 0
}
