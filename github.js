// IVEZONE GitHub layer — real GitHub repositories via the REST API (browser CORS OK).
// Auth = the user's Personal Access Token (classic), stored in IVEZONE settings
// (IVEDB.data().settings.github) so it syncs across devices with the Drive JSON.
// Usage:
//   IVEGH.settings()        -> { token, user } (or {})
//   IVEGH.saveSettings(obj) -> persist into synced settings
//   IVEGH.ready()           -> true when a token is stored
//   IVEGH.user()            -> GET /user (login validation)
//   IVEGH.repos()           -> own repos, most recently updated first
//   IVEGH.createRepo(name, desc, priv) -> new repo with auto-init (main branch)
//   IVEGH.contents(owner, repo, path)  -> dir listing [] or file meta {}
//   IVEGH.putFile(owner, repo, path, file, message)   -> commit (create or update)
//   IVEGH.deleteFile(owner, repo, path, sha, message) -> commit
//   IVEGH.deleteRepo(owner, repo)  -> needs delete_repo scope on the token
//   IVEGH.downloadZip(owner, repo) -> download zipball via token-authed fetch
window.IVEGH = (function () {
  const API = 'https://api.github.com';

  function settings() { const s = IVEDB.data().settings || {}; return s.github || {}; }
  function saveSettings(obj) { const d = IVEDB.data(); d.settings = d.settings || {}; d.settings.github = obj; IVEDB.save(); }
  function ready() { return !!(settings().token); }

  function request(method, path, body, raw) {
    const tok = settings().token;
    if (!tok) return Promise.reject(new Error('GitHub not connected — paste your token first'));
    const opts = {
      method: method,
      headers: {
        'Authorization': 'Bearer ' + tok,
        'Accept': raw ? 'application/vnd.github+json' : 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    };
    if (body !== undefined && body !== null) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    return fetch(API + path, opts).then(r => {
      if (r.status === 401) throw new Error('GitHub token invalid or expired — update it (⚙ TOKEN)');
      if (r.status === 403 && String(r.headers.get('X-RateLimit-Remaining')) === '0') throw new Error('GitHub rate limit hit — try again later');
      if (r.status === 404) throw new Error('Not found on GitHub (wrong name or private repo + bad token)');
      if (!r.ok) {
        return r.json().catch(() => ({})).then(j => {
          let msg = (j && j.message) || ('GitHub API ' + r.status);
          if (r.status === 403 && /delete_repo/i.test((j && j.documentation_url) || '') || r.status === 403 && msg.indexOf('delete') >= 0) msg += ' — your token needs the delete_repo scope';
          const err = new Error(msg);
          err.status = r.status;
          throw err;
        });
      }
      return raw ? r : r.json();
    });
  }

  function user() { return request('GET', '/user'); }

  function repos() {
    return request('GET', '/user/repos?sort=updated&per_page=100&affiliation=owner');
  }

  function createRepo(name, desc, priv) {
    return request('POST', '/user/repos', { name: name, description: desc || '', private: priv !== false, auto_init: true });
  }

  function contents(owner, repo, path) {
    const p = (path || '').split('/').filter(Boolean).map(encodeURIComponent).join('/');
    return request('GET', '/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(repo) + '/contents' + (p ? '/' + p : ''))
      .then(j => Array.isArray(j) ? j : [j]);
  }

  function putFile(owner, repo, path, file, message) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onerror = () => rej(new Error('Could not read ' + path));
      fr.onload = () => {
        const b64 = String(fr.result).split(',')[1] || '';
        // include sha if the file already exists (update commit)
        request('GET', '/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(repo) + '/contents/' + path.split('/').map(encodeURIComponent).join('/'))
          .catch(() => null)
          .then(existing => {
            const body = { message: message || ('Add ' + path + ' via IVEZONE'), content: b64 };
            if (existing && existing.sha && !Array.isArray(existing)) body.sha = existing.sha;
            return request('PUT', '/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(repo) + '/contents/' + path.split('/').map(encodeURIComponent).join('/'), body);
          })
          .then(res, rej);
      };
      fr.readAsDataURL(file);
    });
  }

  function deleteFile(owner, repo, path, sha, message) {
    return request('DELETE', '/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(repo) + '/contents/' + path.split('/').map(encodeURIComponent).join('/'),
      { message: message || ('Delete ' + path + ' via IVEZONE'), sha: sha });
  }

  function deleteRepo(owner, repo) {
    return request('DELETE', '/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(repo));
  }

  function cloneUrl(owner, repo) { return 'https://github.com/' + owner + '/' + repo + '.git'; }
  function repoUrl(owner, repo) { return 'https://github.com/' + owner + '/' + repo; }
  function blobUrl(owner, repo, path) { return repoUrl(owner, repo) + (path ? '/blob/main/' + path.split('/').map(encodeURIComponent).join('/') : ''); }
  function zipUrl(owner, repo) { return repoUrl(owner, repo) + '/zipball/main'; }

  function downloadZip(owner, repo) {
    return request('GET', '/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(repo) + '/zipball/main', null, true)
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = repo + '-main.zip';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      });
  }

  return { settings, saveSettings, ready, request, user, repos, createRepo, contents, putFile, deleteFile, deleteRepo, cloneUrl, repoUrl, blobUrl, zipUrl, downloadZip };
})();
