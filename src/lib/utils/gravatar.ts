import * as md5Hex from 'md5-hex'

// Get gravatar url
export function gravatarUrl(email) {
  return (
    'https://www.gravatar.com/avatar/' +
    md5Hex(email) +
    '?s=200&d=' +
    encodeURIComponent('https://www.gitbook.com/assets/images/avatars/user.png')
  )
}
