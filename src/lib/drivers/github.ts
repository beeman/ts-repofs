import Q from 'q'

import { List, Map, Record } from 'immutable'

import axios from 'axios'
import { Driver } from './driver'

import urlJoin from 'urljoin.js'

import { gravatarUrl } from '../utils/gravatar'

import { encode } from '../utils/base64'

import { ERRORS } from '../constants/errors'
import { Author } from '../models/author'
import { Blob } from '../models/blob'
import { Branch } from '../models/branch'
import { Commit } from '../models/commit'
import { Comparison } from '../models/comparison'
import { LocalFile } from '../models/localFile'
import { Reference } from '../models/reference'
import { TreeEntry } from '../models/treeEntry'
import { WorkingState } from '../models/workingState'

/**
 * Options for the GitHub Driver
 */
const DEFAULTS = {
  // String: ID of the GitHub repository (ex: me/myrepo")
  repository: null,

  // API endpoint
  host: 'https://api.github.com',

  includeTokenInRaw: false,
  // Endpoint for RAW content
  rawhost: 'https://raw.githubusercontent.com',

  // Authentication for the API
  token: null,
  username: null,

  // Include auth token in raw url?
}
class GitHubOptions extends Record(DEFAULTS) {}

// Driver for GitHub APIs and uHub
export class GitHubDriver extends Driver {
  private options: GitHubOptions

  constructor(options) {
    super()
    this.options = new GitHubOptions(options)
  }

  // ---- Fetching ----

  public fetchBlob(sha) {
    return this.get('git/blobs/' + sha, {}).then(r => {
      return Blob.createFromBase64(r.content)
    })
  }

  // https://developer.github.com/v3/git/trees/
  public fetchWorkingState(ref) {
    return this.get('git/trees/' + ref, {
      recursive: 1,
    }).then(tree => {
      const treeEntries = Map().withMutations(function addEntries(map) {
        tree.tree.map(entry => {
          // We ignore trees for now (we flatten the git tree)
          if (entry.type === 'tree') {
            return
          }

          const treeEntry = new TreeEntry({
            blobSize: entry.size,
            sha: entry.sha,
            type: entry.type,
            mode: entry.mode,
          })
          map.set(entry.path, treeEntry)
        })
      })
      return WorkingState.createWithTree(tree.sha, treeEntries)
    })
  }

  public fetchBranches() {
    return this.get('branches').then(branches => {
      console.log('fetchBranches', branches)
      branches = branches.map(branch => {
        // TODO properly detect remote
        return new Branch({
          name: branch.name,
          // commit: normListedCommit(branch.commit),
          // branch.is_local is undefined for GitHub
          remote: branch.is_local === false ? 'origin' : '',
        })
      })

      console.log(branches)

      return List(branches)
    })
  }

  // ------ Flushing -----

  public flushCommit(commitBuilder) {
    // Create blobs required
    const blobPromises = commitBuilder.getBlobs().map((blob, filePath) => {
      return this.post('git/blobs', {
        content: blob.getAsBase64(),
        encoding: 'base64',
      }).then(ghBlob => {
        return [filePath, ghBlob.sha]
      })
    })

    // Wait for all request to finish
    return (
      Q.all(blobPromises.toArray())
        .then(result => {
          // Recreate an object map from the list of [path, sha]
          return result.reduce((res, [key, value]) => {
            res[key] = value
            return res
          }, {})
        })
        // Create new tree
        .then(blobSHAs => {
          const entries = commitBuilder
            .getTreeEntries()
            .map((treeEntry, filePath) => {
              return {
                path: filePath,
                mode: treeEntry.getMode(),
                type: treeEntry.getType(),
                sha: blobSHAs[filePath] || treeEntry.getSha(),
              }
            })
            .toArray()
          return this.post('git/trees', {
            tree: entries,
          })
        })

        // Create the new commit
        .then(ghTree => {
          const committer = commitBuilder.getCommitter()
          const author = commitBuilder.getAuthor()
          const payload = {
            committer: {
              name: committer.getName(),
              email: committer.getEmail(),
            },
            author: {
              name: author.getName(),
              email: author.getEmail(),
            },
            message: commitBuilder.getMessage(),
            parents: commitBuilder.getParents().toArray(),
            tree: ghTree.sha,
          }
          return this.post('git/commits', payload)
        })
        .then(normCreatedCommit)
    )
  }

  // https://developer.github.com/v3/repos/commits/#list-commits-on-a-repository
  public listCommits(opts) {
    opts = opts || {}
    const apiOpts = {
      sha: opts.ref,
      path: opts.path,
      author: opts.author,
      per_page: opts.per_page,
    }

    return this.get('commits', apiOpts).then(commits => {
      return List(commits).map(normListedCommit)
    })
  }

  // https://developer.github.com/v3/repos/commits/#get-a-single-commit
  public fetchCommit(sha) {
    return this.get('commits/' + sha).then(normListedCommit)
  }

  /**
   * Compare two commits.
   * @param {Branch | SHA} base
   * @param {Branch | SHA} head
   * @return {Promise<Comparison>}
   */
  public fetchComparison(base, head) {
    const refs = [base, head].map(x => {
      return x instanceof Branch ? x.getFullName() : x
    })

    return this.get('compare/' + refs[0] + '...' + refs[1]).then(res => {
      return Comparison.create({
        commits: res.commits.map(normListedCommit),
        files: res.files,
        closest: normListedCommit(res.merge_base_commit),
        base,
        head,
      })
    })
  }

  public createRef(ref, sha) {
    return this.post('git/refs', {
      ref: 'refs/heads/' + ref,
      sha,
    })
  }

  public forwardBranch(branch, sha) {
    return (
      this.patch('git/refs/heads/' + branch.getName(), {
        sha,
      })
        // Normalize cannot fast forward errors
        .fail(normNotFF)
    )
  }

  public createBranch(base, name) {
    return this.createRef(name, base.sha).thenResolve(base.merge({ name }))
  }

  public deleteBranch(branch) {
    return this.delete('git/refs/heads/' + branch.getName())
  }

  // https://developer.github.com/v3/repos/merging/
  public merge(from, into, options) {
    const opts = options
    const head = from instanceof Branch ? from.getFullName() : from
    return (
      this.post('merges', {
        base: into.getFullName(),
        head,
        commit_message: opts.message,
      })
        .then(ghCommit => {
          if (!ghCommit) {
            // No commit was needed
            return null
          }
          // The format the same as in commit listing, without files
          ghCommit.files = []
          return normListedCommit(ghCommit)
        })
        // Normalize merge conflict errors
        .fail(normConflict)
    )
  }

  // ---- Only supported by uhub ----
  public checkout(branch) {
    return this.post('local/checkout', {
      branch: branch ? branch.getFullName() : 'HEAD',
    })
  }

  public listRemotes() {
    return this.get('local/remotes')
  }

  public editRemotes(name, url) {
    return this.post('local/remotes', {
      name,
      url,
    })
  }

  public pull(opts: any = {}) {
    opts = (Object as any).assign(
      {
        force: false,
      },
      opts,
    )

    // Convert to ref
    opts.branch = opts.branch.getName()

    return this.post('local/pull', opts)
      .fail(normNotFF)
      .fail(normAuth)
      .fail(normUnknownRemote)
      .fail(normRefNotFound)
  }

  public push(opts: any = {}) {
    opts = (Object as any).assign(
      {
        force: false,
      },
      opts,
    )

    // Convert to ref
    opts.branch = opts.branch.getName()

    return this.post('local/push', opts)
      .fail(normNotFF)
      .fail(normAuth)
      .fail(normUnknownRemote)
      .fail(normRefNotFound)
  }

  public status() {
    return this.get('local/status').then(status => {
      return {
        files: List(status.files).map(file => {
          return LocalFile.create(file)
        }),

        head: new Reference({
          ref: status.head.ref,
          sha: status.head.object.sha,
        }),
      }
    })
  }

  public track(opts) {
    const params: any = {
      message: opts.message,
      files: opts.files
        .map(file => {
          return {
            name: file.getFilename(),
            status: file.getStatus(),
          }
        })
        .toJS(),
    }

    if (opts.author) {
      params.author = {
        name: opts.author.getName(),
        email: opts.author.getEmail(),
        date: opts.author.getDate(),
      }
    }

    if (opts.committer) {
      params.committer = {
        name: opts.author.getName(),
        email: opts.author.getEmail(),
        date: opts.author.getDate(),
      }
    }

    return this.post('local/track', params)
  }

  // API utilities

  /**
   * Execute an GitHub HTTP API request
   * @param {String} httpMethod 'get', 'post', etc.
   * @param {String} method name of the method
   * @param {Object} args Req. parameters for get, or json data for others
   */
  public request(httpMethod, method, args) {
    const axiosOpts: any = {
      method: httpMethod,
      url:
        urlJoin(
          this.options.get('host'),
          '/repos/' + this.options.get('repository') + '/' + method,
        ) +
        '?t=' +
        Date.now(),
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'Content-type': 'application/json;charset=UTF-8',
      },
    }

    const username = this.options.get('username')
    const token = this.options.get('token')

    if (username && token) {
      axiosOpts.headers.Authorization =
        'Basic ' + encode(username + ':' + token)
    } else if (token) {
      axiosOpts.headers.Authorization = 'Token ' + token
    }

    if (httpMethod === 'get') {
      axiosOpts.params = args
    } else {
      axiosOpts.data = args
    }

    // console.log('API', httpMethod.toUpperCase(), method);
    return Q(axios(axiosOpts))
      .get('data')
      .fail(response => {
        if (response instanceof Error) {
          throw response
        }

        const e = new Error(
          response.data.message ||
            'Error ' + response.status + ': ' + response.data,
        )
        // e.statusCode = response.status;

        throw e
      })
  }

  // Shortcuts for API requests
  public get(method, args = {}) {
    console.log('get', { method, args })
    return this.request('get', method, args)
  }

  public post(method, args = {}) {
    return this.request('post', method, args)
  }

  public patch(method, args = {}) {
    return this.request('patch', method, args)
  }

  public delete(method, args = {}) {
    return this.request('delete', method, args)
  }

  public put(method, args = {}) {
    return this.request('put', method, args)
  }
}

function normNotFF(err) {
  const msg = err.message
  if (/fast forward/.test(msg)) {
    err.code = ERRORS.NOT_FAST_FORWARD
  }
  return Q.reject(err)
}

function normConflict(err) {
  const msg = err.message
  if (/merge conflict/i.test(msg)) {
    err.code = ERRORS.CONFLICT
  }
  return Q.reject(err)
}

function normAuth(err) {
  const msg = err.message
  if (
    /Failed to authenticate/.test(msg) ||
    /401/.test(msg) ||
    /auth schemes/.test(msg)
  ) {
    err.code = ERRORS.AUTHENTICATION_FAILED
  }

  return Q.reject(err)
}

function normUnknownRemote(err) {
  const msg = err.message
  if (/specify a URL/.test(msg) || /specify a remote/.test(msg)) {
    err.code = ERRORS.UNKNOWN_REMOTE
  }

  return Q.reject(err)
}

function normRefNotFound(err) {
  const msg = err.message
  if (
    (/^Reference/.test(msg) && /not found$/.test(msg)) ||
    err.statusCode === 404
  ) {
    err.code = ERRORS.REF_NOT_FOUND
  }

  return Q.reject(err)
}

/**
 * Normalize a commit coming from the GitHub commit creation API
 * @param {JSON} ghCommit
 * @return {Commit}
 */
function normCreatedCommit(ghCommit) {
  const commit = Commit.create({
    sha: ghCommit.sha,
    message: ghCommit.message,
    author: getSimpleAuthor(ghCommit.author),
    date: ghCommit.author.date,
    parents: ghCommit.parents.map(function getSha(o) {
      return o.sha
    }),
  })

  return commit
}

/**
 * Normalize a commit coming from the GitHub commit listing API
 * @param {JSON} ghCommit
 * @return {Commit}
 */
function normListedCommit(ghCommit) {
  console.log('ghCommit', ghCommit)
  const commit = Commit.create({
    sha: ghCommit.sha,
    message: ghCommit.commit.message || 'no message',
    // author: getCompleteAuthor(ghCommit),
    date:
      (ghCommit.commit.author && ghCommit.commit.author.date) || 'no author',
    files: ghCommit.files || [],
    parents: ghCommit.parents && ghCommit.parents.map(c => c.sha),
  })

  return commit
}

// Get author from created commit (no avatar)
function getSimpleAuthor(author) {
  return Author.create({
    name: author.name,
    email: author.email,
    date: author.date,
  })
}

// Get author from a listed commit (with avatar)
function getCompleteAuthor(commit) {
  const author = getSimpleAuthor(commit.commit.author)
  const avatar = commit.author
    ? commit.author.avatar_url
    : gravatarUrl(author.getEmail())
  return author.set('avatar', avatar)
}
