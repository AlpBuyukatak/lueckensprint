/* Optional, automatic Supabase progress synchronization. No secret keys are used. */
(function (global) {
  const SCHEMA_VERSION = 2;
  const NORMAL_DEBOUNCE_MS = 2000;
  const EXAM_DEBOUNCE_MS = 6500;
  const POLL_MS = 90000;
  const MAX_RETRIES = 3;
  const now = () => new Date().toISOString();
  const clone = value => JSON.parse(JSON.stringify(value || {}));
  const timestamp = row => String(row?.updated_at || row?.updatedAt || row?.reviewed_at || '');
  const safeText = value => String(value || '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const diagnostic = (label, detail = '') => global.console?.info?.('[LueckenSprint Sync]', label, detail);
  let memoryDeviceId = '';
  const deviceId = () => {
    if (typeof localStorage === 'undefined') return memoryDeviceId || (memoryDeviceId = `device-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    let id = localStorage.getItem('lueckenSprintDeviceId');
    if (!id) { id = global.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(36).slice(2)}`; localStorage.setItem('lueckenSprintDeviceId', id); }
    return id;
  };
  const completeness = value => {
    if (!value || typeof value !== 'object') return value === undefined || value === null || value === '' ? 0 : 1;
    return Object.values(value).reduce((total, item) => total + completeness(item), 0);
  };
  const chooseRecord = (a, b) => {
    if (!a) return b; if (!b) return a;
    const left = timestamp(a), right = timestamp(b);
    if (left !== right) return left > right ? a : b;
    return completeness(a) >= completeness(b) ? a : b;
  };
  const byId = (rows = []) => Object.fromEntries(rows.filter(row => row && row.id).map(row => [row.id, row]));
  const mergeRecords = (left = [], right = []) => {
    const ids = new Set([...Object.keys(byId(left)), ...Object.keys(byId(right))]);
    return [...ids].map(id => chooseRecord(byId(left)[id], byId(right)[id]));
  };
  const mergeErrors = (left = [], right = []) => mergeRecords(left, right).map(row => {
    const a = byId(left)[row.id], b = byId(right)[row.id];
    if (!a || !b) return row;
    return {...row, mastery: Math.max(Number(a.mastery) || 0, Number(b.mastery) || 0), reviewed_at: timestamp(a) > timestamp(b) ? (a.reviewed_at || a.updated_at) : (b.reviewed_at || b.updated_at)};
  });
  const mergeByDate = (left = {}, right = {}) => {
    const output = {...right};
    for (const [date, value] of Object.entries(left || {})) {
      const other = output[date];
      output[date] = typeof value === 'boolean' || typeof other === 'boolean' ? Boolean(value || other) : chooseRecord(value, other);
    }
    return output;
  };
  const mergeCustom = (left, right, tombstones) => {
    const deleted = byId(tombstones);
    return mergeRecords(left, right).filter(row => !deleted[row.id] || timestamp(row) > String(deleted[row.id].deleted_at || deleted[row.id].updated_at || ''));
  };
  const mergeProgress = (local, cloud) => {
    const l = clone(local), c = clone(cloud);
    const tombstones = mergeRecords(l.custom_deleted || [], c.custom_deleted || []);
    const primaryExam = chooseRecord(l.activeExam, c.activeExam) || null;
    const otherExam = l.activeExam && c.activeExam && l.activeExam.id !== c.activeExam.id ? chooseRecord(l.activeExam, c.activeExam) === l.activeExam ? c.activeExam : l.activeExam : null;
    const conflicts = mergeRecords(l.activeExamConflicts || [], c.activeExamConflicts || []);
    if (otherExam && !conflicts.some(exam => exam.id === otherExam.id)) conflicts.push(otherExam);
    const settings = chooseRecord({...l.settings, updated_at:l.sync_meta?.settings_updated_at}, {...c.settings, updated_at:c.sync_meta?.settings_updated_at}) || {};
    const localMeta = l.sync_meta || {}, cloudMeta = c.sync_meta || {};
    return {
      ...c, ...l,
      version: Math.max(Number(l.version) || 1, Number(c.version) || 1),
      settings: clone(settings),
      attempts: mergeRecords(l.attempts, c.attempts),
      errors: mergeErrors(l.errors, c.errors),
      custom: mergeCustom(l.custom || [], c.custom || [], tombstones),
      custom_deleted: tombstones,
      daily: mergeByDate(l.daily, c.daily),
      tasks: mergeByDate(l.tasks, c.tasks),
      seen: [...new Set([...(l.seen || []), ...(c.seen || [])])],
      activeExam: primaryExam,
      activeExamConflicts: conflicts,
      sync_meta: {
        ...cloudMeta, ...localMeta,
        schema_version: SCHEMA_VERSION,
        device_id: deviceId(),
        local_revision: Math.max(Number(localMeta.local_revision) || 0, Number(cloudMeta.local_revision) || 0),
        cloud_revision: Math.max(Number(localMeta.cloud_revision) || 0, Number(cloudMeta.cloud_revision) || 0),
        pending_sync: Boolean(localMeta.pending_sync),
        last_local_change_at: chooseRecord({updated_at:localMeta.last_local_change_at}, {updated_at:cloudMeta.last_local_change_at})?.updated_at || now()
      }
    };
  };

  let client = null, getState = () => ({}), replaceState = () => {}, timer = null, retryTimer = null, user = null, lastSync = '', status = 'Yerel mod', detail = '', pending = false, applying = false;
  const publicKey = cfg => cfg?.publishableKey || cfg?.anonKey || '';
  const configured = () => { const cfg = global.LUECKENSPRINT_SUPABASE_CONFIG || {}; return Boolean(cfg.url && publicKey(cfg) && global.supabase?.createClient); };
  const emit = () => { global.dispatchEvent?.(new CustomEvent('lueckensprint-sync-status', {detail:{status, detail, user, lastSync, pending, configured:configured()}})); mountSettingsPanel(); };
  const setStatus = (next, nextDetail = '') => { status = next; detail = nextDetail; emit(); };
  const persistMeta = () => { try { localStorage.setItem('lueckenSprint', JSON.stringify(getState())); } catch (_) {} };
  const clientForSession = () => {
    if (client || !configured()) return client;
    const cfg = global.LUECKENSPRINT_SUPABASE_CONFIG;
    diagnostic('Supabase config loaded', {urlConfigured:Boolean(cfg.url), publishableKeyConfigured:Boolean(publicKey(cfg))});
    client = global.supabase.createClient(cfg.url, publicKey(cfg), {auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:true}});
    diagnostic('Supabase client created');
    return client;
  };
  const cleanAuthCallbackUrl = () => {
    if (!global.history?.replaceState || !global.location) return;
    const url = new URL(global.location.href), keys = ['code','access_token','refresh_token','expires_in','expires_at','token_type','type']; let changed = false;
    keys.forEach(key => { if (url.searchParams.has(key)) { url.searchParams.delete(key); changed = true; } });
    const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
    if (keys.some(key => hash.has(key))) { url.hash = ''; changed = true; }
    if (changed) global.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
  };
  const readCloud = async () => { const c = clientForSession(); if (!c || !user) return null; const {data, error} = await c.from('user_progress').select('*').eq('user_id', user.id).maybeSingle(); if (error) throw error; return data; };
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const markPending = (kind = 'change') => {
    const state = getState(), meta = state.sync_meta = {...(state.sync_meta || {})};
    meta.schema_version = SCHEMA_VERSION; meta.device_id = deviceId(); meta.local_revision = (Number(meta.local_revision) || 0) + 1; meta.last_local_change_at = now(); meta.updated_at = meta.last_local_change_at; meta.pending_sync = true; pending = true; persistMeta();
    if (!navigator.onLine) setStatus('Çevrimdışı · cihazda kaydedildi');
    else if (user) setStatus('Bekleyen değişiklikler var');
    else setStatus('Yerel mod');
    const delay = kind === 'active-exam' || state.activeExam ? EXAM_DEBOUNCE_MS : NORMAL_DEBOUNCE_MS;
    scheduleSync(delay);
  };
  const scheduleRetry = () => { clearTimeout(retryTimer); retryTimer = setTimeout(() => syncNow({reason:'retry'}), 3000); };
  const syncNow = async ({force = false, reason = 'automatic'} = {}) => {
    if (!navigator.onLine) { if (pending) setStatus('Çevrimdışı · cihazda kaydedildi'); return false; }
    const c = clientForSession();
    if (!c || !user) { setStatus(user ? 'Senkronizasyon hatası' : (configured() ? 'Giriş yapılmadı' : 'Yerel mod')); return false; }
    if (!pending && !force) return true;
    clearTimeout(timer); setStatus('Senkronize ediliyor…');
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const cloud = await readCloud();
        const merged = mergeProgress(getState(), cloud?.progress_data || {});
        const expectedRevision = Number(cloud?.revision) || 0;
        const {data, error} = await c.rpc('save_user_progress', {expected_revision:expectedRevision, next_schema_version:SCHEMA_VERSION, next_progress_data:merged, next_device_id:deviceId()});
        if (error) throw error;
        const result = Array.isArray(data) ? data[0] : data;
        if (!result?.applied) { await pause(250 * (2 ** attempt)); continue; }
        lastSync = now(); pending = false;
        merged.sync_meta = {...(merged.sync_meta || {}), schema_version:SCHEMA_VERSION, device_id:deviceId(), cloud_revision:Number(result.revision) || expectedRevision + 1, pending_sync:false, last_successful_sync_at:lastSync};
        applying = true; replaceState(merged); applying = false;
        setStatus('Senkronize edildi');
        return true;
      } catch (error) {
        diagnostic('Cloud sync failed', error?.message || 'unknown error');
        if (attempt < MAX_RETRIES - 1) { await pause(250 * (2 ** attempt)); continue; }
        pending = true; const state = getState(); state.sync_meta = {...(state.sync_meta || {}), pending_sync:true}; persistMeta(); setStatus('Senkronizasyon yeniden denenecek', error?.message || ''); scheduleRetry(); return false;
      }
    }
    pending = true; setStatus('Senkronizasyon yeniden denenecek'); scheduleRetry(); return false;
  };
  const scheduleSync = (delay = NORMAL_DEBOUNCE_MS) => { clearTimeout(timer); if (!user || !navigator.onLine) return; timer = setTimeout(() => syncNow({reason:'debounced'}), delay); };
  const preMergeSnapshotKey = userId => `first_cloud_premerge_snapshot_${userId}`;
  const snapshotStorage = typeof localStorage !== 'undefined' ? localStorage : {getItem:() => null, setItem:() => {}};
  const createPreMergeSnapshot = (storage, userId, state) => {
    const key = preMergeSnapshotKey(userId);
    if (storage.getItem(key)) return false;
    storage.setItem(key, JSON.stringify({created_at:now(), state:clone(state)}));
    return true;
  };
  const readPreMergeSnapshot = (storage, userId) => {
    const raw = storage.getItem(preMergeSnapshotKey(userId));
    if (!raw) return null;
    try { const snapshot = JSON.parse(raw); return snapshot?.state ? snapshot : null; } catch (_) { return null; }
  };
  const runFirstMerge = async () => {
    if (!user) return false;
    const userId = user.id;
    const state = getState();
    try { createPreMergeSnapshot(snapshotStorage, userId, state); } catch (error) { diagnostic('Pre-merge snapshot failed', error?.message || ''); }
    pending = true; state.sync_meta = {...(state.sync_meta || {}), pending_sync:true}; persistMeta();
    const okay = await syncNow({force:true, reason:'first-sign-in'});
    if (okay) { detail = 'Yerel ve bulut ilerlemesi birleştirildi.'; emit(); }
    return okay;
  };
  const applySession = async (event, session) => {
    diagnostic('Auth event name', event);
    user = session?.user || null;
    if (!user) { setStatus(configured() ? 'Giriş yapılmadı' : 'Yerel mod'); return; }
    diagnostic('Signed-in user email', user.email || '(email unavailable)'); cleanAuthCallbackUrl(); setStatus('Giriş yapıldı');
    await runFirstMerge();
  };
  const initialize = async api => {
    getState = api.getState; replaceState = api.replaceState;
    const state = getState(); lastSync = state.sync_meta?.last_successful_sync_at || ''; pending = Boolean(state.sync_meta?.pending_sync);
    const c = clientForSession();
    if (!c) { diagnostic('Supabase client unavailable'); setStatus('Yerel mod'); return; }
    c.auth.onAuthStateChange((event, session) => { applySession(event, session).catch(error => setStatus('Senkronizasyon hatası', error?.message || '')); });
    try { const {data:{session}, error} = await c.auth.getSession(); if (error) throw error; diagnostic(session ? 'Initial session found' : 'Initial session missing'); await applySession('INITIAL_SESSION', session); } catch (error) { diagnostic('Initial session check failed', error?.message || ''); setStatus('Senkronizasyon hatası', error?.message || ''); }
    global.addEventListener('online', () => { if (user) { setStatus('Senkronize ediliyor…'); syncNow({force:true, reason:'online'}); } });
    global.addEventListener('focus', () => syncNow({force:true, reason:'focus'}));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow({force:true, reason:'visible'}); });
    setInterval(() => syncNow({force:true, reason:'periodic'}), POLL_MS);
  };
  const signIn = async email => { const c = clientForSession(); if (!c) throw new Error('Supabase yapılandırması eksik.'); const {error} = await c.auth.signInWithOtp({email, options:{emailRedirectTo:global.location.origin + global.location.pathname}}); if (error) throw error; setStatus('Giriş bağlantısı gönderildi'); };
  const signOut = async () => {
    if (pending) {
      if (!navigator.onLine) { if (!global.confirm('Henüz buluta gönderilmemiş yerel değişiklikler var. Yine de çıkış yapmak istiyor musunuz?')) return; }
      else await syncNow({force:true, reason:'sign-out'});
    }
    if (client) await client.auth.signOut(); user = null; setStatus('Giriş yapılmadı');
  };
  const onLocalSave = () => { if (!applying) markPending(getState().activeExam ? 'active-exam' : 'change'); };
  const restorePreMergeSnapshot = () => {
    if (!user) return false;
    const snapshot = readPreMergeSnapshot(snapshotStorage, user.id);
    if (!snapshot) return false;
    replaceState(clone(snapshot.state));
    setStatus('Bekleyen değişiklikler var');
    return true;
  };
  const mountRecoveryControl = () => {
    const advanced = document.querySelector('.advanced-backup');
    if (!advanced) return;
    let host = advanced.querySelector('#preMergeRecoveryHost');
    if (!host) { host = document.createElement('div'); host.id = 'preMergeRecoveryHost'; advanced.appendChild(host); }
    const snapshot = user && readPreMergeSnapshot(snapshotStorage, user.id);
    if (!snapshot) { host.innerHTML = ''; return; }
    host.innerHTML = '<button class="button-outline" id="restorePreMergeSnapshot">İlk bulut birleştirmesi öncesi yerel durumu geri yükle</button>';
    host.querySelector('#restorePreMergeSnapshot')?.addEventListener('click', () => { if (restorePreMergeSnapshot()) setStatus('Bekleyen değişiklikler var'); });
  };
  const mountSettingsPanel = () => {
    let host = document.querySelector('#syncPanelHost'); if (!host && global.VIEW === 'settings') { host = document.createElement('div'); host.id = 'syncPanelHost'; document.querySelector('#main')?.appendChild(host); } if (!host) return;
    const time = lastSync ? new Intl.DateTimeFormat('tr-TR', {dateStyle:'short', timeStyle:'short'}).format(new Date(lastSync)) : 'Henüz senkronize edilmedi';
    const account = user ? `<p class="sync-account"><strong>Giriş yapıldı</strong><br><span>${safeText(user.email)}</span><br><small>Son senkronizasyon: ${time}</small></p>` : `<p class="sync-account"><strong>Giriş yapılmadı</strong><br><small>${configured() ? 'Yerel verileriniz bu cihazda korunur.' : 'Yerel mod'}</small></p>`;
    const errorDetails = detail && /^Senkronizasyon (yeniden denenecek|hatası)$/.test(status) ? `<details class="sync-details"><summary>Teknik ayrıntılar</summary><code>${safeText(detail)}</code></details>` : '';
    host.innerHTML = `<section class="card sync-panel"><h2>Bulut senkronizasyonu</h2>${account}<p class="sync-status">${safeText(status)}</p>${pending ? '<p class="sync-pending">Bekleyen değişiklikler var</p>' : ''}${errorDetails}${user ? '<button class="button-danger" id="signOut">Çıkış yap</button>' : `<form id="magicLinkForm" class="choice-row"><input required type="email" id="syncEmail" placeholder="E-posta adresi" aria-label="E-posta adresi"><button class="button">Giriş bağlantısı gönder</button></form>`}</section>`;
    host.querySelector('#magicLinkForm')?.addEventListener('submit', async event => { event.preventDefault(); try { await signIn(host.querySelector('#syncEmail').value); } catch (error) { setStatus('Senkronizasyon hatası', error?.message || ''); } });
    host.querySelector('#signOut')?.addEventListener('click', signOut);
    mountRecoveryControl();
  };
  global.LueckenSync = {initialize, onLocalSave, syncNow, signIn, signOut, mountSettingsPanel, runFirstMerge, restorePreMergeSnapshot, mergeProgress, chooseRecord, completeness};
  if (typeof module !== 'undefined') module.exports = {mergeProgress, chooseRecord, completeness, mergeErrors, mergeByDate, preMergeSnapshotKey, createPreMergeSnapshot, readPreMergeSnapshot};
})(typeof window !== 'undefined' ? window : globalThis);
