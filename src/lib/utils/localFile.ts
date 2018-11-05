import { LocalFile } from '../models/localFile'

export const LocalUtils = {
  status(driver) {
    return driver.status()
  },

  /**
   * Perform track / untrack of working directory.
   *
   * @param {RepositoryState} repoState
   * @param {Driver} driver
   * @param {String} message
   * @param {Author} author
   * @return {Promise}
   */
  track(driver, files, message, author) {
    files = files.map(file => {
      return LocalFile.create(file)
    })

    return driver.track({
      message,
      files,
      author,
      committer: author,
    })
  },
}
