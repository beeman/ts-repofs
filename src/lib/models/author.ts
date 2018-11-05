import { Record } from 'immutable'

const DEFAULTS = {
  name: String(),
  email: String(),
  date: new Date(),
  avatar: String(), // url
}

/**
 * Represents a commit author.
 * @type {Class}
 */
export class Author extends Record(DEFAULTS) {
  // ---- Statics

  /**
   * Create a new author
   * @param {Object} infos
   * @return {Author}
   */
  public static create(opts) {
    if (opts instanceof Author) {
      return opts
    }

    return new Author({
      name: opts.name,
      email: opts.email,
      avatar: opts.avatar,
      date: new Date(opts.date),
    })
  }

  public static encode(author) {
    return author.toJS()
  }

  public static decode(json) {
    return Author.create(json)
  }
  // ---- Properties Getter ----
  public getName() {
    return this.get('name')
  }

  public getEmail() {
    return this.get('email')
  }

  public getDate() {
    return this.get('date')
  }

  public getAvatar() {
    return this.get('avatar')
  }
}
