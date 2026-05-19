const { useState, useEffect, useMemo, useRef, useCallback } = React;

// ----- constants ---------------------------------------------------------

const STATUSES = [
  { key: 'done',  label: 'เสร็จแล้ว',      short: 'เสร็จ',       color: 'var(--done)' },
  { key: 'doing', label: 'กำลังทำ',        short: 'กำลังทำ',     color: 'var(--doing)' },
  { key: 'todo',  label: 'ยังไม่เริ่ม',     short: 'ยังไม่เริ่ม', color: 'var(--todo)' },
  { key: 'skip',  label: 'ไม่ต้องทำ',      short: 'ไม่ต้องทำ',   color: 'var(--skip)' },
];

const WORK_TYPES = [
  'กล่าวเปิดงาน',
  'ประชุมหารือ',
  'มอบนโยบาย',
  'บรรยาย',
  'อื่นๆ',
];

const API_URL_KEY = 'work-log-api-url-v1';
const VIEW_KEY    = 'work-log-view-v1';
const SORT_KEY    = 'work-log-sort-v1';

const FONT_OPTIONS = [
  { key: 'IBM Plex Sans Thai', label: 'IBM Plex Sans Thai' },
  { key: 'Sarabun',            label: 'Sarabun' },
  { key: 'Prompt',             label: 'Prompt' },
  { key: 'Noto Sans Thai',     label: 'Noto Sans Thai' },
  { key: 'Kanit',              label: 'Kanit' },
];

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "font": "IBM Plex Sans Thai"
}/*EDITMODE-END*/;

// ----- helpers -----------------------------------------------------------

const THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const THAI_MONTHS_LONG = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

function formatThaiDate(iso, opts = {}) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  const day = d.getDate();
  const month = opts.long ? THAI_MONTHS_LONG[d.getMonth()] : THAI_MONTHS[d.getMonth()];
  const year = (d.getFullYear() + 543).toString().slice(-2);
  const yearLong = d.getFullYear() + 543;
  return `${day} ${month} ${opts.long ? yearLong : year}`;
}

function todayIso() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

function fullThaiToday() {
  const d = new Date();
  const wd = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'][d.getDay()];
  return `วัน${wd} ${d.getDate()} ${THAI_MONTHS_LONG[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function statusMeta(key) {
  return STATUSES.find(s => s.key === key) || STATUSES[2];
}

// ----- API ---------------------------------------------------------------
// ใช้ text/plain เพื่อเลี่ยง CORS preflight ของ Apps Script
async function apiGet(url) {
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'unknown error');
  return data.entries || [];
}

async function apiPost(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'unknown error');
  return data;
}

// ----- icons -------------------------------------------------------------

const Icon = {
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
    </svg>
  ),
  Plus: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
  Edit: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
    </svg>
  ),
  Trash: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    </svg>
  ),
  Table: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>
    </svg>
  ),
  Cards: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="4" width="7" height="7" rx="1.5"/>
      <rect x="3" y="13" width="7" height="7" rx="1.5"/><rect x="14" y="13" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  Inbox: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6Z"/>
    </svg>
  ),
  Clipboard: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1"/>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <path d="M9 14l2 2 4-4"/>
    </svg>
  ),
  Layers: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 2 9 5-9 5-9-5 9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>
    </svg>
  ),
  CheckCircle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>
    </svg>
  ),
  Clock: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
    </svg>
  ),
  CircleDashed: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 3">
      <circle cx="12" cy="12" r="9"/>
    </svg>
  ),
  MinusCircle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>
    </svg>
  ),
  Sparkle: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6z"/>
    </svg>
  ),
  Settings: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  Cloud: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 19a4.5 4.5 0 1 0-2.4-8.3 6 6 0 0 0-11.6 2.3A4 4 0 0 0 4 19h13.5Z"/>
    </svg>
  ),
  Sync: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>
    </svg>
  ),
  Warn: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/>
      <path d="M12 9v4M12 17h.01"/>
    </svg>
  ),
  Check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  ),
};

// ----- App ---------------------------------------------------------------

function App() {
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem(API_URL_KEY) || '');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(0); // active write count

  const [view, setView]   = useState(() => localStorage.getItem(VIEW_KEY) || 'table');
  const [sort, setSort]   = useState(() => localStorage.getItem(SORT_KEY) || 'date-desc');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState([]);    // array of workType values (empty = all)
  const [statusFilter, setStatusFilter] = useState([]); // array of status keys (empty = all)
  const [assignedFilter, setAssignedFilter] = useState('all'); // 'all' | 'yes' | 'no'
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // persist UI prefs
  useEffect(() => { localStorage.setItem(VIEW_KEY, view); }, [view]);
  useEffect(() => { localStorage.setItem(SORT_KEY, sort); }, [sort]);

  // tweaks (font)
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  useEffect(() => {
    document.documentElement.style.setProperty('--font', `'${t.font}', system-ui, sans-serif`);
  }, [t.font]);

  // toast helper
  const showToast = useCallback((msg, kind = 'error') => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 4500);
  }, []);

  // load entries
  const loadEntries = useCallback(async (url) => {
    if (!url) return;
    setLoading(true);
    setLoadError(null);
    try {
      const list = await apiGet(url);
      setEntries(list);
    } catch (err) {
      setLoadError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (apiUrl) loadEntries(apiUrl);
  }, [apiUrl, loadEntries]);

  // stats
  const stats = useMemo(() => {
    const s = { total: entries.length, done: 0, doing: 0, todo: 0, skip: 0 };
    for (const e of entries) s[e.status] = (s[e.status] || 0) + 1;
    return s;
  }, [entries]);

  // filtered + sorted
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = entries.filter(e => {
      if (q && !(e.name || '').toLowerCase().includes(q)) return false;
      if (typeFilter.length > 0) {
        const wt = e.workType || '__none__';
        if (!typeFilter.includes(wt)) return false;
      }
      if (statusFilter.length > 0 && !statusFilter.includes(e.status)) return false;
      if (assignedFilter !== 'all') {
        const a = isAssigned(e.assigned);
        if (assignedFilter === 'yes' && !a) return false;
        if (assignedFilter === 'no'  &&  a) return false;
      }
      return true;
    });
    list.sort((a, b) => {
      const cmp = String(a.date || '').localeCompare(String(b.date || ''));
      if (cmp !== 0) return sort === 'date-asc' ? cmp : -cmp;
      return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
    });
    return list;
  }, [entries, query, sort, typeFilter, statusFilter, assignedFilter]);

  const activeFilterCount =
    (typeFilter.length > 0 ? 1 : 0) +
    (statusFilter.length > 0 ? 1 : 0) +
    (assignedFilter !== 'all' ? 1 : 0);

  const toggleFilter = (list, setList, value) => {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  };

  const clearFilters = () => { setTypeFilter([]); setStatusFilter([]); setAssignedFilter('all'); setQuery(''); };

  // mutations: optimistic + rollback on error
  const withBusy = async (fn) => {
    setBusy(b => b + 1);
    try { return await fn(); } finally { setBusy(b => Math.max(0, b - 1)); }
  };

  const openNew  = () => setEditing({ id: null, name: '', workType: '', date: todayIso(), status: 'todo', assigned: false });
  const openEdit = (e) => setEditing({ ...e });
  const closeModal = () => setEditing(null);

  const saveEntry = async (data) => {
    if (!data.name.trim()) return;
    setEditing(null);

    if (data.id) {
      // update
      const before = entries;
      const updated = { ...entries.find(e => e.id === data.id), ...data };
      setEntries(es => es.map(e => e.id === data.id ? updated : e));
      try {
        await withBusy(() => apiPost(apiUrl, { action: 'update', ...updated }));
      } catch (err) {
        setEntries(before);
        showToast('แก้ไขไม่สำเร็จ: ' + err.message);
      }
    } else {
      // create
      const newEntry = { ...data, id: uid(), createdAt: Date.now() };
      setEntries(es => [newEntry, ...es]);
      try {
        await withBusy(() => apiPost(apiUrl, { action: 'create', ...newEntry }));
      } catch (err) {
        setEntries(es => es.filter(e => e.id !== newEntry.id));
        showToast('บันทึกไม่สำเร็จ: ' + err.message);
      }
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    const before = entries;
    setEntries(es => es.filter(e => e.id !== target.id));
    try {
      await withBusy(() => apiPost(apiUrl, { action: 'delete', id: target.id }));
    } catch (err) {
      setEntries(before);
      showToast('ลบไม่สำเร็จ: ' + err.message);
    }
  };

  // ---- setup screen ----
  if (!apiUrl) {
    return (
      <SetupScreen
        onConnect={(url) => {
          localStorage.setItem(API_URL_KEY, url);
          setApiUrl(url);
        }}
      />
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header__left">
          <div className="header__logo">
            <Icon.Clipboard/>
          </div>
          <div>
            <h1 className="header__title">บันทึกงาน</h1>
            <p className="header__subtitle">ติดตามงาน วันที่ปฏิบัติ และสถานะการสรุปสาระสำคัญ</p>
          </div>
        </div>
        <div className="header__right">
          <SyncStatus busy={busy} error={loadError}/>
          <button className="btn btn--ghost btn--icon" onClick={() => setSettingsOpen(true)} title="ตั้งค่า">
            <Icon.Settings/>
          </button>
        </div>
      </header>

      <section className="stats">
        <div className="stat stat--total">
          <div className="stat__icon"><Icon.Layers/></div>
          <div className="stat__body">
            <div className="stat__label">ทั้งหมด</div>
            <div className="stat__value">{stats.total}</div>
            <div className="stat__hint">รายการบันทึก</div>
          </div>
        </div>
        <div className="stat stat--done">
          <div className="stat__icon"><Icon.CheckCircle/></div>
          <div className="stat__body">
            <div className="stat__label">เสร็จแล้ว</div>
            <div className="stat__value">{stats.done + stats.skip}</div>
            <div className="stat__hint">
              {stats.total ? Math.round(((stats.done + stats.skip) / stats.total) * 100) : 0}% ของทั้งหมด
              {stats.skip > 0 && <span className="stat__sub"> · รวมไม่ต้องทำ {stats.skip}</span>}
            </div>
          </div>
        </div>
        <div className="stat stat--doing">
          <div className="stat__icon"><Icon.Clock/></div>
          <div className="stat__body">
            <div className="stat__label">กำลังทำ</div>
            <div className="stat__value">{stats.doing}</div>
            <div className="stat__hint">อยู่ระหว่างดำเนินการ</div>
          </div>
        </div>
        <div className="stat stat--todo">
          <div className="stat__icon"><Icon.CircleDashed/></div>
          <div className="stat__body">
            <div className="stat__label">ยังไม่เริ่ม</div>
            <div className="stat__value">{stats.todo}</div>
            <div className="stat__hint">รอดำเนินการ</div>
          </div>
        </div>
        <div className="stat stat--skip">
          <div className="stat__icon"><Icon.MinusCircle/></div>
          <div className="stat__body">
            <div className="stat__label">ไม่ต้องทำ</div>
            <div className="stat__value">{stats.skip}</div>
            <div className="stat__hint">ไม่ต้องสรุป</div>
          </div>
        </div>
      </section>

      <div className="toolbar">
        <div className="search">
          <span className="search__icon"><Icon.Search/></span>
          <input
            type="text"
            placeholder="ค้นหาจากชื่องาน…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="date-desc">เรียงวันที่: ใหม่ → เก่า</option>
          <option value="date-asc">เรียงวันที่: เก่า → ใหม่</option>
        </select>
        <button
          className={`btn ${filtersOpen || activeFilterCount > 0 ? 'btn--active' : ''}`}
          onClick={() => setFiltersOpen(o => !o)}
          aria-expanded={filtersOpen}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M7 12h10M10 18h4"/></svg>
          ตัวกรอง
          {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
        </button>
        <div className="view-toggle" role="tablist" aria-label="มุมมอง">
          <button
            className={view === 'table' ? 'active' : ''}
            onClick={() => setView('table')}
            aria-pressed={view === 'table'}
          ><Icon.Table/> ตาราง</button>
          <button
            className={view === 'cards' ? 'active' : ''}
            onClick={() => setView('cards')}
            aria-pressed={view === 'cards'}
          ><Icon.Cards/> การ์ด</button>
        </div>
        <button className="btn btn--primary" onClick={openNew}>
          <Icon.Plus/> เพิ่มงาน
        </button>
      </div>

      {filtersOpen && (
        <div className="filter-panel">
          <div className="filter-row">
            <div className="filter-row__label">ประเภทงาน</div>
            <div className="chip-picker">
              {WORK_TYPES.map(wt => (
                <button
                  key={wt}
                  type="button"
                  className={`chip chip--sm ${typeFilter.includes(wt) ? 'active' : ''}`}
                  onClick={() => toggleFilter(typeFilter, setTypeFilter, wt)}
                >{wt}</button>
              ))}
              <button
                type="button"
                className={`chip chip--sm ${typeFilter.includes('__none__') ? 'active' : ''}`}
                onClick={() => toggleFilter(typeFilter, setTypeFilter, '__none__')}
              >ไม่ระบุ</button>
            </div>
          </div>
          <div className="filter-row">
            <div className="filter-row__label">สรุปสาระสำคัญ</div>
            <div className="chip-picker">
              {STATUSES.map(s => (
                <button
                  key={s.key}
                  type="button"
                  className={`chip chip--sm ${statusFilter.includes(s.key) ? 'active' : ''}`}
                  onClick={() => toggleFilter(statusFilter, setStatusFilter, s.key)}
                >
                  <span className="chip__dot" style={{background: s.color}}/>{s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-row">
            <div className="filter-row__label">มอบหมาย</div>
            <div className="chip-picker">
              {[
                { key: 'all', label: 'ทั้งหมด' },
                { key: 'yes', label: 'ได้รับมอบหมาย' },
                { key: 'no',  label: 'ไม่ได้รับมอบหมาย' },
              ].map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  className={`chip chip--sm ${assignedFilter === opt.key ? 'active' : ''}`}
                  onClick={() => setAssignedFilter(opt.key)}
                >{opt.label}</button>
              ))}
            </div>
          </div>
          {activeFilterCount > 0 && (
            <div className="filter-row">
              <div className="filter-row__summary">
                แสดง <strong>{visible.length}</strong> จากทั้งหมด <strong>{entries.length}</strong> รายการ
              </div>
              <button className="btn btn--sm btn--ghost" onClick={clearFilters}>◯ ล้างตัวกรองทั้งหมด</button>
            </div>
          )}
        </div>
      )}

      {loading && entries.length === 0 ? (
        <LoadingState/>
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={() => loadEntries(apiUrl)} onSettings={() => setSettingsOpen(true)}/>
      ) : visible.length === 0 ? (
        <EmptyState
          isFiltered={query.length > 0}
          onAdd={openNew}
          onClear={() => setQuery('')}
        />
      ) : view === 'table' ? (
        <TableView entries={visible} onEdit={openEdit} onDelete={setDeleting}/>
      ) : (
        <CardsView entries={visible} onEdit={openEdit} onDelete={setDeleting}/>
      )}

      {editing && (
        <EntryModal entry={editing} onSave={saveEntry} onClose={closeModal}/>
      )}

      {deleting && (
        <ConfirmDelete entry={deleting} onConfirm={confirmDelete} onClose={() => setDeleting(null)}/>
      )}

      {settingsOpen && (
        <SettingsModal
          apiUrl={apiUrl}
          onClose={() => setSettingsOpen(false)}
          onChangeUrl={(url) => {
            localStorage.setItem(API_URL_KEY, url);
            setApiUrl(url);
            setSettingsOpen(false);
          }}
          onDisconnect={() => {
            localStorage.removeItem(API_URL_KEY);
            setApiUrl('');
            setEntries([]);
            setSettingsOpen(false);
          }}
          onRefresh={() => { loadEntries(apiUrl); setSettingsOpen(false); }}
        />
      )}

      {toast && <Toast {...toast}/>}

      {window.TweaksPanel && (
        <window.TweaksPanel title="Tweaks">
          <window.TweakSection title="แบบอักษร">
            <window.TweakSelect
              label="ฟอนต์"
              value={t.font}
              onChange={(v) => setTweak('font', v)}
              options={FONT_OPTIONS.map(f => ({ value: f.key, label: f.label }))}
            />
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              เปลี่ยนแบบอักษรของทั้งแอป
            </div>
          </window.TweakSection>
        </window.TweaksPanel>
      )}
    </div>
  );
}

// ----- Sub components ----------------------------------------------------

function SyncStatus({ busy, error }) {
  if (error) {
    return (
      <div className="sync sync--err" title={error}>
        <Icon.Warn/> ออฟไลน์
      </div>
    );
  }
  if (busy > 0) {
    return (
      <div className="sync sync--busy">
        <span className="spinner"/> กำลังบันทึก…
      </div>
    );
  }
  return (
    <div className="sync sync--ok">
      <Icon.Cloud/> เชื่อมต่อแล้ว
    </div>
  );
}

function StatusPill({ status }) {
  const m = statusMeta(status);
  const iconMap = {
    done:  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
    doing: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
    todo:  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 2.5"><circle cx="12" cy="12" r="9"/></svg>,
    skip:  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>,
  };
  return <span className={`pill pill--${m.key}`}>{iconMap[m.key]}{m.short}</span>;
}

function isAssigned(v) {
  return v === true || v === 'TRUE' || v === 'yes' || v === 'true';
}

function AssignedBadge({ assigned }) {
  if (!isAssigned(assigned)) return null;
  return (
    <span className="assigned-badge" title="ได้รับมอบหมายให้ดำเนินการ">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
      ได้รับมอบหมาย
    </span>
  );
}

function TableView({ entries, onEdit, onDelete }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th style={{width:'34%'}}>ชื่องาน</th>
            <th style={{width:'16%'}}>ประเภทงาน</th>
            <th style={{width:'16%'}}>วันที่ปฏิบัติงาน</th>
            <th style={{width:'22%'}}>สรุปสาระสำคัญ</th>
            <th style={{width:'12%', textAlign:'right'}}>การจัดการ</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(e => (
            <tr key={e.id} className="row">
              <td className="cell--name">{e.name}</td>
              <td>{e.workType ? <span className="type-chip">{e.workType}</span> : <span className="cell--muted">—</span>}</td>
              <td className="cell--date">{formatThaiDate(e.date)}</td>
              <td><div className="status-cell"><StatusPill status={e.status}/><AssignedBadge assigned={e.assigned}/></div></td>
              <td className="cell--actions">
                <button className="btn btn--ghost btn--sm" onClick={() => onEdit(e)} title="แก้ไข">
                  <Icon.Edit/> แก้ไข
                </button>
                <button className="btn btn--ghost btn--sm" onClick={() => onDelete(e)} title="ลบ" style={{color:'var(--danger)'}}>
                  <Icon.Trash/>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CardsView({ entries, onEdit, onDelete }) {
  return (
    <div className="cards">
      {entries.map(e => (
        <div key={e.id} className="card">
          <div className="card__header">
            <div className="card__title">{e.name}</div>
            <div className="status-cell"><StatusPill status={e.status}/></div>
          </div>
          {e.workType && <div className="card__type"><span className="type-chip">{e.workType}</span></div>}
          <AssignedBadge assigned={e.assigned}/>
          <div className="card__meta">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
            {formatThaiDate(e.date, { long: true })}
          </div>
          <div className="card__actions">
            <button className="btn btn--ghost btn--sm" onClick={() => onEdit(e)}>
              <Icon.Edit/> แก้ไข
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => onDelete(e)} style={{color:'var(--danger)'}}>
              <Icon.Trash/> ลบ
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="empty">
      <div className="empty__icon"><span className="spinner spinner--lg"/></div>
      <div className="empty__title">กำลังโหลดข้อมูล…</div>
      <div className="empty__desc">กำลังดึงรายการงานจาก Google Sheet</div>
    </div>
  );
}

function ErrorState({ message, onRetry, onSettings }) {
  return (
    <div className="empty empty--err">
      <div className="empty__icon" style={{background:'var(--danger-bg)', color:'var(--danger)'}}><Icon.Warn/></div>
      <div className="empty__title">เชื่อมต่อไม่สำเร็จ</div>
      <div className="empty__desc" style={{wordBreak:'break-word'}}>
        ไม่สามารถเชื่อมต่อ Google Sheet ได้<br/>
        <code style={{fontSize:12, color:'var(--text-soft)'}}>{message}</code>
      </div>
      <div style={{display:'flex', gap:8, justifyContent:'center'}}>
        <button className="btn" onClick={onRetry}><Icon.Sync/> ลองใหม่</button>
        <button className="btn btn--primary" onClick={onSettings}><Icon.Settings/> ตั้งค่า</button>
      </div>
    </div>
  );
}

function EmptyState({ isFiltered, onAdd, onClear }) {
  if (isFiltered) {
    return (
      <div className="empty">
        <div className="empty__icon"><Icon.Search/></div>
        <div className="empty__title">ไม่พบรายการที่ค้นหา</div>
        <div className="empty__desc">ลองใช้คำค้นอื่น หรือล้างคำค้นเพื่อแสดงงานทั้งหมด</div>
        <button className="btn" onClick={onClear}>ล้างคำค้น</button>
      </div>
    );
  }
  return (
    <div className="empty">
      <div className="empty__icon"><Icon.Inbox/></div>
      <div className="empty__title">ยังไม่มีการบันทึกงาน</div>
      <div className="empty__desc">เริ่มต้นบันทึกงานแรกของคุณเพื่อติดตามความคืบหน้า</div>
      <button className="btn btn--primary" onClick={onAdd}><Icon.Plus/> เพิ่มงานแรก</button>
    </div>
  );
}

function EntryModal({ entry, onSave, onClose }) {
  const [name, setName] = useState(entry.name || '');
  const [workType, setWorkType] = useState(entry.workType || '');
  const [date, setDate] = useState(entry.date || todayIso());
  const [status, setStatus] = useState(entry.status || 'todo');
  const [assigned, setAssigned] = useState(entry.assigned === true || entry.assigned === 'TRUE' || entry.assigned === 'yes');
  const [touched, setTouched] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const isNew = !entry.id;
  const valid = name.trim().length > 0;

  const submit = (e) => {
    e?.preventDefault();
    setTouched(true);
    if (!valid) return;
    onSave({ id: entry.id, name: name.trim(), workType, date, status, assigned });
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="modal" onSubmit={submit}>
        <div className="modal__header">
          <h2 className="modal__title">{isNew ? 'เพิ่มงานใหม่' : 'แก้ไขงาน'}</h2>
          <p className="modal__desc">{isNew ? 'กรอกรายละเอียดของงานที่ต้องการบันทึก' : 'ปรับปรุงข้อมูลของงานนี้'}</p>
        </div>
        <div className="modal__body">
          <div className="field">
            <label className="field__label" htmlFor="name">ชื่องาน</label>
            <input
              id="name"
              ref={inputRef}
              type="text"
              placeholder="เช่น ประชุมสรุปโครงการ Q2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(true)}
              style={touched && !valid ? { borderColor: 'var(--danger)' } : {}}
            />
            {touched && !valid && <span className="field__hint" style={{color:'var(--danger)'}}>กรุณาระบุชื่องาน</span>}
          </div>

          <div className="field">
            <label className="field__label">ประเภทงาน</label>
            <div className="chip-picker" role="radiogroup">
              {WORK_TYPES.map(wt => (
                <button
                  key={wt}
                  type="button"
                  role="radio"
                  aria-checked={workType === wt}
                  className={`chip ${workType === wt ? 'active' : ''}`}
                  onClick={() => setWorkType(workType === wt ? '' : wt)}
                >
                  {wt}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="date">วันที่ปฏิบัติงาน</label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field__label">สรุปสาระสำคัญ</label>
            <div className="status-picker" role="radiogroup">
              {STATUSES.map(s => (
                <button
                  key={s.key}
                  type="button"
                  role="radio"
                  aria-checked={status === s.key}
                  className={`status-option ${status === s.key ? 'active' : ''}`}
                  onClick={() => setStatus(s.key)}
                >
                  <span className="status-option__dot" style={{background: s.color}}/>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="field__label">ได้รับมอบหมายให้ดำเนินการ</label>
            <div className="toggle-group" role="radiogroup">
              <button
                type="button"
                role="radio"
                aria-checked={assigned === true}
                className={`toggle-option ${assigned === true ? 'active' : ''}`}
                onClick={() => setAssigned(true)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                ใช่ ได้รับมอบหมาย
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={assigned === false}
                className={`toggle-option ${assigned === false ? 'active' : ''}`}
                onClick={() => setAssigned(false)}
              >
                ไม่ได้รับมอบหมาย
              </button>
            </div>
          </div>
        </div>
        <div className="modal__footer">
          <button type="button" className="btn" onClick={onClose}>ยกเลิก</button>
          <button type="submit" className="btn btn--primary" disabled={!valid}>
            {isNew ? 'บันทึก' : 'บันทึกการแก้ไข'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ConfirmDelete({ entry, onConfirm, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter')  onConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{maxWidth: 420}}>
        <div className="modal__header">
          <h2 className="modal__title">ยืนยันการลบ</h2>
          <p className="modal__desc">
            คุณแน่ใจหรือไม่ว่าต้องการลบงาน "<strong style={{color:'var(--text)'}}>{entry.name}</strong>" การกระทำนี้ไม่สามารถยกเลิกได้
          </p>
        </div>
        <div className="modal__footer">
          <button className="btn" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn--danger" onClick={onConfirm}>ลบงานนี้</button>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({ apiUrl, onClose, onChangeUrl, onDisconnect, onRefresh }) {
  const [url, setUrl] = useState(apiUrl);
  const [confirmDC, setConfirmDC] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const changed = url.trim() && url.trim() !== apiUrl;

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{maxWidth: 520}}>
        <div className="modal__header">
          <h2 className="modal__title">ตั้งค่า</h2>
          <p className="modal__desc">การเชื่อมต่อ Google Sheet</p>
        </div>
        <div className="modal__body">
          <div className="field">
            <label className="field__label">URL ของ Google Apps Script</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={{padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12}}
            />
            <span className="field__hint">URL จาก Deploy → Web app ลงท้ายด้วย /exec</span>
          </div>

          <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            <button className="btn btn--sm" onClick={onRefresh}>
              <Icon.Sync/> รีโหลดข้อมูล
            </button>
            {!confirmDC ? (
              <button className="btn btn--sm" onClick={() => setConfirmDC(true)} style={{color:'var(--danger)'}}>
                <Icon.Trash/> ตัดการเชื่อมต่อ
              </button>
            ) : (
              <button className="btn btn--sm btn--danger" onClick={onDisconnect}>
                ยืนยันตัดการเชื่อมต่อ
              </button>
            )}
          </div>
        </div>
        <div className="modal__footer">
          <button className="btn" onClick={onClose}>ปิด</button>
          <button
            className="btn btn--primary"
            disabled={!changed}
            onClick={() => onChangeUrl(url.trim())}
          >
            บันทึก URL ใหม่
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ msg, kind }) {
  return (
    <div className={`toast toast--${kind}`}>
      {kind === 'error' ? <Icon.Warn/> : <Icon.Check/>}
      <span>{msg}</span>
    </div>
  );
}

// ----- Setup screen ------------------------------------------------------

function SetupScreen({ onConnect }) {
  const [url, setUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState(null);

  const ok = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec\/?$/.test(url.trim());

  const test = async () => {
    setTesting(true);
    setError(null);
    try {
      const entries = await apiGet(url.trim());
      onConnect(url.trim());
      void entries;
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="setup">
      <div className="setup__inner">
        <div className="setup__brand">
          <div className="setup__logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h2M14 14h2M8 18h2M14 18h2"/>
            </svg>
          </div>
          <div>
            <h1 className="setup__title">บันทึกงาน</h1>
            <p className="setup__subtitle">เชื่อมต่อ Google Sheet เพื่อเริ่มใช้งาน</p>
          </div>
        </div>

        <ol className="setup__steps">
          <li>
            <strong>สร้าง Google Sheet</strong> ใหม่ ใส่หัวคอลัมน์แถวที่ 1:
            <code className="setup__code">id · name · date · status · createdAt</code>
          </li>
          <li>
            ใน Sheet เปิด <strong>Extensions → Apps Script</strong> วางโค้ดจากไฟล์{' '}
            <code className="setup__inline">apps-script.gs</code> แก้ <code className="setup__inline">SHEET_ID</code>
          </li>
          <li>
            กด <strong>Deploy → New deployment → Web app</strong>
            <br/>
            <span style={{color:'var(--text-soft)', fontSize:13}}>
              Execute as: Me · Who has access: Anyone
            </span>
          </li>
          <li>
            คัดลอก <strong>Web app URL</strong> มาวางด้านล่าง
          </li>
        </ol>

        <div className="setup__form">
          <label className="field__label">Web app URL</label>
          <input
            type="text"
            placeholder="https://script.google.com/macros/s/.../exec"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="setup__input"
          />
          {error && (
            <div className="setup__error">
              <Icon.Warn/> เชื่อมต่อไม่สำเร็จ: <code>{error}</code>
            </div>
          )}
          <button
            className="btn btn--primary"
            onClick={test}
            disabled={!ok || testing}
            style={{justifyContent:'center', padding:'12px 18px'}}
          >
            {testing ? <><span className="spinner"/> กำลังทดสอบ…</> : <><Icon.Cloud/> เชื่อมต่อ</>}
          </button>
          {url && !ok && (
            <div className="setup__hint">
              URL ควรลงท้ายด้วย <code>/exec</code>
            </div>
          )}
        </div>

        <div className="setup__foot">
          ดูคู่มือฉบับเต็มในไฟล์ <code>SETUP.md</code> ในโปรเจกต์
        </div>
      </div>
    </div>
  );
}

// ----- mount -------------------------------------------------------------

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
