// IVEHUB data layer — Google Drive (drive.file scope) with localStorage fallback.
// Single JSON file "ivehub-data.json" in the user's own Drive.
// Usage:
//   IVEDB.data()            -> current data object (mutate, then call save)
//   IVEDB.save()            -> persist (localStorage always; Drive if connected, debounced)
//   IVEDB.connect()         -> OAuth popup, find/create Drive file, merge newest
//   IVEDB.disconnect()      -> forget token (data stays in localStorage)
//   IVEDB.status()          -> { connected, fileId, clientIdSet, lastSync }
//   IVEDB.uid()             -> unique id
//   IVEDB.onChange(fn)      -> callback after every successful save
window.IVEDB = (function () {
  const LS_DATA = 'ivehub_data';
  const LS_FILEID = 'ivehub_drive_fileid';
  const DRIVE_FILENAME = 'ivehub-data.json';
  const SCOPE = 'https://www.googleapis.com/auth/drive.file';
  const CFG = () => window.IVEHUB_CONFIG || {};
  const GOOGLE = () => (CFG().google || {});

  let state = null;
  let fileId = null;
  let token = null;
  let connected = false;
  let lastSync = null;
  let saveTimer = null;
  const listeners = [];

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function blank() {
    return {
      version: 1,
      apps: { business: [], databases: [], personal: [], development: [] },
      favorites: [],
      projects: [],
      brain: { notes: [], ideas: [], knowledge: [], bookmarks: [] },
      tech: { servers: [], domains: [], devices: [], tools: [] },
      life: { goals: [], timeline: [], records: [] },
      settings: { accent: '', compact: false, dash: { usage: true, favs: true, recent: true } },
      updated: 0
    };
  }

  // Seed from config.js (first run only, before any user data exists)
  function seed() {
    const d = blank();
    const A = CFG().apps || {};
    const map = (list) => (list || []).map(a => ({ id: uid(), icon: a.icon || '🔗', name: a.name || '', url: a.url || '', desc: a.desc || '' }));
    d.apps.business = [].concat(map(A.mgm), map(A.lunar), map(A.modu));
    d.apps.databases = map(A.db);
    return d;
  }

  function normalize(d) {
    const b = blank();
    if (!d || typeof d !== 'object') return b;
    b.version = d.version || 1;
    for (const cat of Object.keys(b.apps)) {
      b.apps[cat] = Array.isArray(d.apps && d.apps[cat]) ? d.apps[cat] : [];
    }
    b.favorites = Array.isArray(d.favorites) ? d.favorites : [];
    b.projects = Array.isArray(d.projects) ? d.projects : [];
    for (const k of Object.keys(b.brain)) b.brain[k] = Array.isArray(d.brain && d.brain[k]) ? d.brain[k] : [];
    for (const k of Object.keys(b.tech)) b.tech[k] = Array.isArray(d.tech && d.tech[k]) ? d.tech[k] : [];
    for (const k of Object.keys(b.life)) b.life[k] = Array.isArray(d.life && d.life[k]) ? d.life[k] : [];
    b.settings = Object.assign({ accent: '', compact: false }, d.settings || {});
    b.settings.dash = Object.assign({ usage: true, favs: true, recent: true }, (d.settings && d.settings.dash) || {});
    b.updated = d.updated || 0;
    return b;
  }

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  function init() {
    const raw = lsGet(LS_DATA);
    if (raw) {
      try { state = normalize(JSON.parse(raw)); } catch (e) { state = null; }
    }
    if (!state) {
      state = seed();
      lsSet(LS_DATA, JSON.stringify(state));
    }
    fileId = lsGet(LS_FILEID) || null;
  }

  function data() { return state; }

  function replace(d) { state = normalize(d); save(); }

  function emit() { listeners.forEach(fn => { try { fn(state); } catch (e) {} }); }

  function save() {
    state.updated = Date.now();
    lsSet(LS_DATA, JSON.stringify(state));
    if (connected && token) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(driveWrite, 800);
    }
    emit();
  }

  // ---------- Google Drive ----------
  function loadGsi() {
    return new Promise((res, rej) => {
      if (window.google && window.google.accounts && window.google.accounts.oauth2) return res();
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => res();
      s.onerror = () => rej(new Error('Could not load Google Identity Services (check internet/adblock)'));
      document.head.appendChild(s);
    });
  }

  function connect() {
    const cid = GOOGLE().clientId;
    if (!cid) return Promise.reject(new Error('Google Client ID not set — add google.clientId in config.js (see README)'));
    return new Promise((res, rej) => {
      loadGsi().then(() => {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: cid,
          scope: SCOPE,
          callback: (resp) => {
            if (resp.error) return rej(new Error(resp.error + (resp.error_description ? ': ' + resp.error_description : '')));
            token = resp.access_token;
            driveBootstrap().then(res).catch(rej);
          }
        });
        client.requestAccessToken({ prompt: '' });
      }).catch(rej);
    });
  }

  function disconnect() {
    token = null; connected = false; fileId = null; lastSync = null;
    lsDel(LS_FILEID);
    emit();
  }

  function api(url, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ Authorization: 'Bearer ' + token }, opts.headers || {});
    return fetch(url, opts).then(r => {
      if (r.status === 401) { connected = false; throw new Error('Drive session expired — reconnect'); }
      if (!r.ok) throw new Error('Drive API ' + r.status);
      return r;
    });
  }

  function driveFind() {
    const q = encodeURIComponent("name='" + DRIVE_FILENAME + "' and trashed=false");
    return api('https://www.googleapis.com/drive/v3/files?q=' + q + '&fields=files(id,name)&pageSize=5')
      .then(r => r.json())
      .then(j => (j.files && j.files.length) ? j.files[0].id : null);
  }

  function driveRead(fid) {
    return api('https://www.googleapis.com/drive/v3/files/' + fid + '?alt=media')
      .then(r => r.text())
      .then(t => normalize(JSON.parse(t)));
  }

  function driveCreate() {
    const meta = { name: DRIVE_FILENAME, mimeType: 'application/json' };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
    form.append('file', new Blob([JSON.stringify(state)], { type: 'application/json' }));
    return api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', { method: 'POST', body: form })
      .then(r => r.json())
      .then(j => j.id);
  }

  function driveWrite() {
    if (!fileId) return driveCreate().then(id => { fileId = id; lsSet(LS_FILEID, id); lastSync = Date.now(); });
    return api('https://www.googleapis.com/upload/drive/v3/files/' + fileId + '?uploadType=media', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    }).then(() => { lastSync = Date.now(); emit(); });
  }

  function driveBootstrap() {
    return driveFind().then(fid => {
      if (!fid) {
        // no file in Drive yet -> push local data up
        return driveCreate().then(id => { fileId = id; lsSet(LS_FILEID, id); connected = true; lastSync = Date.now(); });
      }
      fileId = fid; lsSet(LS_FILEID, fid);
      return driveRead(fid).then(remote => {
        connected = true;
        // newest wins; tie -> remote
        if ((remote.updated || 0) >= (state.updated || 0)) {
          state = remote;
          lsSet(LS_DATA, JSON.stringify(state));
          lastSync = Date.now();
        } else {
          return driveWrite();
        }
      });
    });
  }

  function status() {
    return { connected, fileId, clientIdSet: !!GOOGLE().clientId, lastSync };
  }

  function onChange(fn) { listeners.push(fn); }

  init();

  return { data, save, connect, disconnect, status, uid, onChange, replace };
})();
