/**
 * A set of utilities to coerce arguments.
 */

/**
 * @param {Branch | String}
 * @return {String} The branch fullname
 */
export function branchName(branch) {
  return typeof branch === 'string' ? branch : branch.getFullName()
}
