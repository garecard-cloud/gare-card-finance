/* ============================================================
   GARE CARD — App shell v2 (Firebase Auth + Firestore + POS)
   ============================================================ */
const { useState, useEffect, useRef } = React;

/* ---- Firestore-aware store ---- */
function useStore(user) {
  const G = window.GC;
  const [state, setState] = useState(() => G.load());
  const today = () => new Date().toISOString().slice(0, 10);

  /* Real-time Firestore listener */
  useEffect(() => {
    if (!user || !window.gcStore) return;
    const unsub = window.gcStore.subscribeAll((remote) => {
      G.save(remote);
      setState(remote);
    });
    return unsub;
  }, [user?.uid]);

  const persist = (next) => { setState(next); G.save(next); };

  /* Firestore individual writes — background, non-blocking, async-safe */
  const fs = (fn) => { try { const p = fn(); if (p && typeof p.catch === 'function') p.catch(e => console.warn('[FS]', e)); } catch (e) { console.warn('[FS]', e); } };

  return {
    state,
    addTx(tx) {
      const t = { id: G.uid('TX'), slip: null, ...tx };
      persist({ ...state, transactions: [...state.transactions, t] });
      fs(() => window.gcStore?.saveTransaction(t));
    },
    addManyTx(arr) {
      const items = arr.map(tx => ({ id: G.uid('TX'), slip: null, ...tx }));
      persist({ ...state, transactions: [...state.transactions, ...items] });
      fs(() => items.forEach(t => window.gcStore?.saveTransaction(t)));
    },
    delTx(id) {
      persist({ ...state, transactions: state.transactions.filter(t => t.id !== id) });
      fs(() => window.gcStore?.deleteTransaction(id));
    },
    addProduct(p) {
      const id = G.uid('PRD');
      const prod = { ...p, id, sku: p.sku || id, createdAt: today() };
      persist({ ...state, products: [...state.products, prod] });
      fs(() => window.gcStore?.saveProduct(prod));
    },
    updateProduct(id, patch) {
      const products = state.products.map(p => p.id === id ? { ...p, ...patch } : p);
      persist({ ...state, products });
      const prod = products.find(p => p.id === id);
      fs(() => prod && window.gcStore?.saveProduct(prod));
    },
    delProduct(id) {
      persist({ ...state, products: state.products.filter(p => p.id !== id), movements: state.movements.filter(m => m.productId !== id) });
      fs(() => window.gcStore?.deleteProduct(id));
    },
    addMovement(m) {
      const id = G.uid('MV');
      const prod = G.findProduct(state, m.productId);
      const products = state.products.map(p => p.id === m.productId
        ? { ...p, qty: m.type === 'in' ? p.qty + m.qty : Math.max(0, p.qty - m.qty) } : p);
      const { toFinance, ...mv } = m;
      const transactions = [...state.transactions];
      if (toFinance && prod) {
        const tx = { id: G.uid('TX'), type: m.type === 'in' ? 'expense' : 'income', cat: m.type === 'in' ? 'restock' : 'sale', amount: m.qty * m.unitPrice, date: m.date, note: `${m.type === 'in' ? 'รับเข้า' : 'ขาย'} ${prod.name} x${m.qty}`, slip: null, linkedMv: id };
        transactions.push(tx);
        fs(() => window.gcStore?.saveTransaction(tx));
      }
      const movement = { id, ...mv };
      persist({ ...state, products, movements: [...state.movements, movement], transactions });
      fs(() => { window.gcStore?.saveMovement(movement); products.filter(p => p.id === m.productId).forEach(p => window.gcStore?.saveProduct(p)); });
    },
    delMovement(id) {
      const mv = state.movements.find(m => m.id === id);
      if (!mv) return;
      const products = state.products.map(p => p.id === mv.productId ? { ...p, qty: mv.type === 'in' ? Math.max(0, p.qty - mv.qty) : p.qty + mv.qty } : p);
      persist({ ...state, products, movements: state.movements.filter(m => m.id !== id), transactions: state.transactions.filter(t => t.linkedMv !== id) });
      fs(() => { window.gcStore?.deleteMovement(id); products.filter(p => p.id === mv.productId).forEach(p => window.gcStore?.saveProduct(p)); });
    },
    updateCapital(amount) {
      const next = { ...state, startingCapital: amount };
      persist(next);
      fs(() => window.gcStore?.saveSettings({ startingCapital: amount }));
    },
    reset() {
      const s = G.reset(); setState(s);
      if (window.gcStore) { window.gcStore.seedFromLocalState(s).catch(console.warn); }
    },
  };
}

/* ---- Nav definitions (role-filtered) ---- */
const ALL_NAV = [
  { k: 'dashboard', label: 'Dashboard', ico: '◧', roles: null },
  { k: 'finance',   label: 'Finance',   ico: '฿',  roles: ['admin','staff'] },
  { k: 'stock',     label: 'Inventory', ico: '▤',  roles: ['admin','staff'] },
  { k: 'reports',   label: 'Reports',   ico: '◔',  roles: null },
  { k: 'pos',       label: 'POS Bridge',ico: '⊙',  roles: ['admin'] },
  { k: 'users',     label: 'Users',     ico: '⊕',  roles: ['admin'] },
];

/* ---- Tweaks ---- */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{"rough":62,"tilt":true,"accent":"#8df731","tornDepth":72,"scratches":true}/*EDITMODE-END*/;

function applyTweaks(t) {
  const root = document.documentElement;
  root.style.setProperty('--grain-opacity', (0.04 + (t.rough/100)*0.16).toFixed(3));
  root.style.setProperty('--lime', t.accent);
  root.style.setProperty('--lime-deep', shade(t.accent, -0.18));
  root.style.setProperty('--torn-opacity', ((t.tornDepth ?? 72)/100).toFixed(2));
  root.style.setProperty('--scratch-opacity', t.scratches !== false ? '0.055' : '0');
  const d = document.querySelector('#paperTear feDisplacementMap');
  if (d) d.setAttribute('scale', Math.round(3 + (t.rough/100)*20));
  const d2 = document.querySelector('#tapeTear feDisplacementMap');
  if (d2) d2.setAttribute('scale', Math.round((3 + (t.rough/100)*20)*0.6));
  document.body.classList.toggle('flat', !t.tilt);
}
function shade(hex, amt) {
  try {
    let c = hex.replace('#',''); if (c.length===3) c=c.split('').map(x=>x+x).join('');
    let [r,g,b] = [0,2,4].map(i=>parseInt(c.slice(i,i+2),16));
    return '#'+[r,g,b].map(x=>Math.max(0,Math.min(255,Math.round(x*(1+amt)))).toString(16).padStart(2,'0')).join('');
  } catch { return hex; }
}

/* ---- Global Search ---- */
function SearchDropdown({ results, onAction }) {
  return (
    <div style={{ position:'absolute', top:'100%', left:0, right:0, marginTop:4, background:'var(--ink-2)', border:'1.5px solid rgba(141,247,49,0.22)', boxShadow:'0 8px 30px rgba(0,0,0,0.6)', zIndex:30, maxHeight:380, overflow:'auto' }}>
      {results.map((r, i) => (
        <div key={i} onClick={() => { r.action(); onAction?.(); }} style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid rgba(141,247,49,0.08)', display:'flex', alignItems:'center', gap:12 }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(141,247,49,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
          <span style={{ fontSize:16, color:r.tone==='pos'?'var(--lime-deep)':r.tone==='neg'?'var(--red)':'rgba(239,233,216,0.4)', flexShrink:0, width:20, textAlign:'center' }}>{r.icon}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="mono" style={{ fontSize:13, fontWeight:700, color:'var(--paper)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.label}</div>
            <div className="label" style={{ color:'rgba(239,233,216,0.45)', fontSize:11, marginTop:2, letterSpacing:'0.06em', textTransform:'none' }}>{r.sub}</div>
          </div>
          <span className="chip" style={{ fontSize:10, color:'rgba(239,233,216,0.3)', borderColor:'rgba(239,233,216,0.15)', padding:'2px 6px', flexShrink:0 }}>{r.type==='product'?'สินค้า':r.type==='tx'?'การเงิน':r.type==='mv'?'เคลื่อนไหว':'หน้า'}</span>
        </div>
      ))}
    </div>
  );
}

function GlobalSearch({ store, go }) {
  const G = window.GC;
  const s = store.state;
  const [q, setQ] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const inputRef = React.useRef();
  const wrapRef = React.useRef();

  // Keyboard shortcut: / or Ctrl+K
  React.useEffect(() => {
    const h = (e) => {
      if ((e.key === '/' || (e.key === 'k' && (e.ctrlKey || e.metaKey))) && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault(); inputRef.current?.focus(); setOpen(true);
      }
      if (e.key === 'Escape') { setOpen(false); setQ(''); inputRef.current?.blur(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // Close on outside click
  React.useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const kw = q.trim().toLowerCase();
  let results = [];
  if (kw.length >= 1) {
    // Products
    s.products.filter(p => p.name.toLowerCase().includes(kw) || (p.sku||'').toLowerCase().includes(kw) || (p.tags||[]).join(' ').includes(kw)).slice(0,5).forEach(p => {
      results.push({ type: 'product', icon: '▤', label: p.name, sub: `${p.sku} · คงเหลือ ${p.qty} · ${G.money(p.price)}`, action: () => { go('item', p.id); setOpen(false); setQ(''); } });
    });
    // Transactions
    s.transactions.filter(t => (t.note||'').toLowerCase().includes(kw) || ((G.FIN_CATS[t.cat]||{}).label||'').toLowerCase().includes(kw)).slice(0,4).forEach(t => {
      results.push({ type: 'tx', icon: t.type==='income'?'↘':'↗', label: t.note || (G.FIN_CATS[t.cat]||{}).label || '—', sub: `${G.fmtDate(t.date)} · ${t.type==='income'?'+':'−'}${G.money(t.amount)}`, action: () => { go('finance'); setOpen(false); setQ(''); }, tone: t.type==='income'?'pos':'neg' });
    });
    // Movements
    s.movements.filter(m => { const p = G.findProduct(s, m.productId); return p && (p.name.toLowerCase().includes(kw) || (m.note||'').toLowerCase().includes(kw)); }).slice(0,3).forEach(m => {
      const p = G.findProduct(s, m.productId);
      results.push({ type: 'mv', icon: m.type==='in'?'↓':'↑', label: p ? p.name : '—', sub: `${m.type==='in'?'รับเข้า':'จ่ายออก'} ${m.qty} ชิ้น · ${G.fmtDate(m.date)}`, action: () => { if (p) go('item', p.id); setOpen(false); setQ(''); }, tone: m.type==='in'?'pos':'neg' });
    });
    // Page shortcuts
    [['dashboard','DASHBOARD','◧'],['finance','FINANCE','฿'],['stock','INVENTORY','▤'],['reports','REPORTS','◔'],['pos','POS BRIDGE','⊙']].filter(([k,l]) => l.toLowerCase().includes(kw)).forEach(([k,l,ico]) => {
      results.push({ type: 'page', icon: ico, label: l, sub: 'หน้า', action: () => { go(k); setOpen(false); setQ(''); } });
    });
  }

  return (
    <>
      {/* Desktop search bar */}
      <div ref={wrapRef} className="topbar-search-wrap">
        <div className="row gap-s" style={{ alignItems:'center', background:'rgba(10,12,8,0.65)', backdropFilter:'blur(8px)', border:`1.5px solid ${open?'rgba(141,247,49,0.55)':'rgba(141,247,49,0.18)'}`, padding:'7px 12px', transition:'border-color 0.15s' }}>
          <span style={{ fontSize:15, opacity:0.4, color:'var(--lime)', flexShrink:0 }}>⌕</span>
          <input ref={inputRef} value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
            placeholder="ค้นหาสินค้า, รายการเงิน, SKU… (กด /)"
            style={{ flex:1, background:'transparent', border:'none', outline:'none', fontFamily:'var(--font-mono)', fontSize:13, color:'var(--paper)', padding:0 }} />
          {q && <button onClick={() => { setQ(''); setOpen(false); inputRef.current?.blur(); }} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(239,233,216,0.45)', fontSize:15, lineHeight:1, padding:0 }}>✕</button>}
          {!q && <span className="label" style={{ color:'rgba(239,233,216,0.28)', fontSize:10, flexShrink:0 }}>⌘K</span>}
        </div>
        {open && results.length > 0 && <SearchDropdown results={results} />}
        {open && kw.length >= 1 && results.length === 0 && (
          <div style={{ position:'absolute', top:'100%', left:0, right:0, marginTop:4, background:'var(--ink-2)', border:'1.5px solid rgba(141,247,49,0.18)', padding:'16px 14px', zIndex:30 }}>
            <div className="mono" style={{ fontSize:13, color:'rgba(239,233,216,0.45)', textAlign:'center' }}>ไม่พบ "{q}"</div>
          </div>)}
      </div>

      {/* Mobile search icon (hidden on desktop) */}
      <button className="topbar-search-mobile-btn btn ghost sm" onClick={() => setMobileOpen(true)}
        style={{ border:'1.5px solid rgba(141,247,49,0.3)', color:'var(--lime)', fontSize:18, padding:'7px 12px', clipPath:'none' }}>⌕</button>

      {/* Mobile search overlay */}
      {mobileOpen && (
        <div className="search-overlay" onMouseDown={() => { setMobileOpen(false); setQ(''); }}>
          <div onMouseDown={e => e.stopPropagation()} className="col" style={{ gap:8 }}>
            <div className="row gap-s" style={{ alignItems:'center', background:'rgba(10,12,8,0.9)', border:'1.5px solid rgba(141,247,49,0.4)', padding:'10px 14px' }}>
              <span style={{ color:'var(--lime)', fontSize:16, opacity:0.7 }}>⌕</span>
              <input autoFocus value={q} onChange={e => setQ(e.target.value)}
                placeholder="ค้นหาสินค้า, รายการเงิน, SKU…"
                style={{ flex:1, background:'transparent', border:'none', outline:'none', fontFamily:'var(--font-mono)', fontSize:15, color:'var(--paper)', padding:0 }} />
              <button onClick={() => { setMobileOpen(false); setQ(''); }} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(239,233,216,0.55)', fontSize:20, padding:0 }}>✕</button>
            </div>
            {results.length > 0 && (
              <div style={{ background:'var(--ink-2)', border:'1.5px solid rgba(141,247,49,0.18)', maxHeight:'70vh', overflow:'auto' }}>
                <SearchDropdown results={results} onAction={() => { setMobileOpen(false); setQ(''); }} />
              </div>)}
            {kw.length >= 1 && results.length === 0 && (
              <div className="mono" style={{ fontSize:14, color:'rgba(239,233,216,0.45)', textAlign:'center', padding:24 }}>ไม่พบ "{q}"</div>)}
          </div>
        </div>)}
    </>
  );
}

/* ---- Bottom Nav (mobile only) ---- */
function BottomNav({ nav, activeNav, go }) {
  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {nav.slice(0, 5).map(n => (
        <div key={n.k} className={`bottom-nav-item ${activeNav===n.k?'active':''}`} onClick={() => go(n.k)}>
          <span className="bn-ico">{n.ico}</span>
          <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:52 }}>{n.label.length>7?n.label.slice(0,7)+'…':n.label}</span>
        </div>
      ))}
    </nav>
  );
}

/* ---- Top bar user info (right side, sticky) ---- */
function TopBar({ user, role, store, go }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const isFirebase = window.GCFirebaseReady;
  const name = user?.displayName || user?.email || 'Local Mode';
  const initial = name[0].toUpperCase();

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 8,
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 16px 10px 22px',
    }}>
      {/* Global search */}
      <GlobalSearch store={store} go={go} />

      {/* User chip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        background: 'rgba(10,12,8,0.78)', backdropFilter: 'blur(8px)',
        border: '1.5px solid rgba(141,247,49,0.18)',
        padding: '7px 13px 7px 10px',
        cursor: 'pointer', position: 'relative',
      }} onClick={() => setMenuOpen(o => !o)}>
        {/* avatar */}
        {user?.photoURL
          ? <img src={user.photoURL} alt="" style={{ width: 28, height: 28, borderRadius: 14, flexShrink: 0, border: '1.5px solid rgba(141,247,49,0.4)' }} />
          : <div style={{ width: 28, height: 28, borderRadius: 14, background: 'var(--lime)', flexShrink: 0, display: 'grid', placeItems: 'center' }}>
              <span className="display" style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1 }}>{initial}</span>
            </div>}
        {/* name + role */}
        <div className="col" style={{ gap: 1 }}>
          <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--paper)', whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
          <div className="row gap-s" style={{ alignItems: 'center' }}>
            <span className="label" style={{ color: 'var(--lime)', fontSize: 10, letterSpacing: '0.15em' }}>{(role || 'local').toUpperCase()}</span>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: isFirebase ? '#4caf50' : 'rgba(239,233,216,0.3)', flexShrink: 0 }} title={isFirebase ? 'Firestore synced' : 'Local mode'} />
          </div>
        </div>
        <span style={{ fontSize: 11, color: 'rgba(239,233,216,0.4)', marginLeft: 2 }}>▾</span>

        {/* dropdown */}
        {menuOpen && (
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 6,
            background: 'var(--ink-2)', border: '1.5px solid rgba(141,247,49,0.22)',
            minWidth: 200, zIndex: 20, boxShadow: '4px 6px 0 rgba(0,0,0,0.5)',
          }} onMouseLeave={() => setMenuOpen(false)}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(141,247,49,0.15)' }}>
              <div className="mono" style={{ fontSize: 13, color: 'var(--paper)', fontWeight: 700 }}>{name}</div>
              <div className="label" style={{ color: 'rgba(239,233,216,0.5)', marginTop: 3, fontSize: 11 }}>{user?.email || 'localStorage'}</div>
            </div>
            {isFirebase && (
              <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(141,247,49,0.1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: 4, background: '#4caf50' }} />
                <span className="mono" style={{ fontSize: 12, color: 'rgba(239,233,216,0.7)' }}>Firestore connected</span>
              </div>
            )}
            {isFirebase && (
              <button style={{ width: '100%', textAlign: 'left', padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--red)', fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center' }}
                onClick={() => { window.GCAuth?.signOut(); window.gcStore?.destroy(); window.gcStore = null; setMenuOpen(false); }}>↩ Sign out</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Sync status pill ---- */
function SyncBadge({ user, role }) {
  if (!user) return null;
  const isFirebase = window.GCFirebaseReady;
  return (
    <div style={{ padding: '10px 20px', borderTop: '2px solid rgba(10,12,8,0.15)' }}>
      <div className="row gap-s" style={{ alignItems: 'center', marginBottom: 10 }}>
        {user.photoURL
          ? <img src={user.photoURL} alt="" style={{ width: 28, height: 28, borderRadius: 14, flexShrink: 0 }} />
          : <div style={{ width: 28, height: 28, borderRadius: 14, background: 'var(--ink)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <span className="display" style={{ fontSize: 13, color: 'var(--lime)' }}>{(user.displayName || user.email || '?')[0].toUpperCase()}</span>
            </div>}
        <div className="brand-text" style={{ flex: 1, minWidth: 0 }}>
          <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.displayName || user.email}</div>
          <div className="label" style={{ color: 'rgba(10,12,8,0.55)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em' }}>{role || 'staff'}</div>
        </div>
      </div>
      <div className="row gap-s" style={{ marginBottom: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: 4, background: isFirebase ? '#4caf50' : 'rgba(10,12,8,0.35)', flexShrink: 0, marginTop: 1 }} />
        <span className="label brand-text" style={{ color: 'rgba(10,12,8,0.55)', fontSize: 10 }}>{isFirebase ? 'Firestore sync' : 'Local mode'}</span>
      </div>
      <button className="btn sm brand-text" style={{ background: 'var(--ink)', color: 'var(--lime)', width: '100%', justifyContent: 'center', clipPath: 'none', fontSize: 12 }}
        onClick={() => window.GCAuth?.signOut().then(() => { window.gcStore?.destroy(); window.gcStore = null; })}>
        Sign out
      </button>
    </div>
  );
}

/* ---- Main App ---- */
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [authState, setAuthState] = useState('loading');
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const store = useStore(user);
  const [route, setRoute] = useState(() => {
    const h = location.hash.slice(1).split('/');
    return { view: h[0] || 'dashboard', id: h[1] || null };
  });

  /* Firebase auth listener */
  useEffect(() => {
    if (!window.GCFirebaseReady) { setAuthState('local'); return; }
    return window.GCAuth.onAuthStateChanged(async (fbUser) => {
      if (!fbUser) { setAuthState('unauth'); setUser(null); setUserRole(null); return; }
      const storeId = window.GARE_STORE_ID || fbUser.uid;
      if (!window.gcStore) window.gcStore = new FirestoreStore(window.GCDB, storeId);
      try {
        const isFirst = await window.gcStore.isFirstUser();
        if (isFirst) {
          await window.gcStore.setUser(fbUser.uid, { uid: fbUser.uid, email: fbUser.email, displayName: fbUser.displayName || fbUser.email, photoURL: fbUser.photoURL || null, role: 'admin', createdAt: new Date().toISOString() });
          await window.gcStore.seedFromLocalState(window.GC.load());
          setUser(fbUser); setUserRole('admin'); setAuthState('authed');
        } else {
          const role = await window.gcStore.getUserRole(fbUser.uid);
          if (!role) {
            await window.gcStore.setUser(fbUser.uid, { uid: fbUser.uid, email: fbUser.email, displayName: fbUser.displayName || fbUser.email, photoURL: fbUser.photoURL || null, role: null, createdAt: new Date().toISOString() });
            setUser(fbUser); setUserRole(null); setAuthState('pending');
          } else {
            window.gcStore.setUser(fbUser.uid, { uid: fbUser.uid, lastSeen: new Date().toISOString() }).catch(() => {});
            setUser(fbUser); setUserRole(role); setAuthState('authed');
          }
        }
      } catch (e) {
        console.error('[Auth setup]', e);
        setUser(fbUser); setUserRole('admin'); setAuthState('authed');
      }
    });
  }, []);

  useEffect(() => { applyTweaks(t); }, [t]);
  useEffect(() => {
    const onHash = () => { const h = location.hash.slice(1).split('/'); setRoute({ view: h[0] || 'dashboard', id: h[1] || null }); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  /* ---- Auth gates ---- */
  if (authState === 'loading') return <LoadingScreen />;
  if (authState === 'unauth') return <AuthScreen onSuccess={() => {}} />;
  if (authState === 'pending') return <PendingScreen user={user} onLogout={() => { window.GCAuth?.signOut(); window.gcStore?.destroy(); window.gcStore = null; }} />;

  /* ---- Main App ---- */
  const role = authState === 'local' ? 'admin' : (userRole || 'viewer');
  const currentUser = authState === 'local' ? null : user;
  const nav = ALL_NAV.filter(n => !n.roles || n.roles.includes(role));

  const go = (view, id = null) => {
    setRoute({ view, id });
    location.hash = id ? `${view}/${id}` : view;
    document.querySelector('.main')?.scrollTo({ top: 0 });
  };

  const v = route.view;
  let activeNav = v;
  if (v === 'item') activeNav = 'stock';
  if (v === 'movement') activeNav = 'reports';

  return (
    <div className="shell">
      {/* Film scratch overlay */}
      <div aria-hidden="true" style={{ position:'fixed',inset:0,zIndex:-1,pointerEvents:'none',opacity:'var(--scratch-opacity,0.055)',backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600'%3E%3Cline x1='-200' y1='48' x2='800' y2='51' stroke='white' stroke-width='0.7' opacity='0.55'/%3E%3Cline x1='-200' y1='148' x2='800' y2='143' stroke='white' stroke-width='0.4' opacity='0.4'/%3E%3Cline x1='-200' y1='290' x2='800' y2='295' stroke='white' stroke-width='0.9' opacity='0.35'/%3E%3Cline x1='-200' y1='390' x2='800' y2='385' stroke='white' stroke-width='0.5' opacity='0.5'/%3E%3Cline x1='-200' y1='510' x2='800' y2='514' stroke='white' stroke-width='0.6' opacity='0.3'/%3E%3Cline x1='80' y1='-10' x2='77' y2='610' stroke='white' stroke-width='0.3' opacity='0.2'/%3E%3Cline x1='320' y1='-10' x2='323' y2='610' stroke='white' stroke-width='0.4' opacity='0.18'/%3E%3C/svg%3E")`,backgroundRepeat:'repeat'}} />

      {/* Sidebar */}
      <aside className="rail rail-grain">
        <div style={{ padding: '26px 18px 18px' }}>
          <img className="brand-word brand-text" src="assets/wordmark.png" alt="GARE CARD" />
          <div className="label brand-text" style={{ color:'rgba(10,12,8,0.6)', marginTop:12, textAlign:'center', letterSpacing:'0.28em' }}>STOCK · FINANCE OS</div>
          <div className="brand-mini-text" style={{ display:'none' }}>
            <img src="assets/mascot.png" alt="GARE" style={{ width:44, display:'block', margin:'0 auto' }} />
          </div>
        </div>
        <nav style={{ marginTop:8, flex:1 }}>
          {nav.map(n => (
            <div key={n.k} className={`nav-item ${activeNav===n.k?'active':''}`} onClick={() => go(n.k)}>
              <span className="nav-ico">{n.ico}</span>
              <span className="txt">{n.label}</span>
            </div>
          ))}
        </nav>
        {currentUser
          ? <SyncBadge user={currentUser} role={role} />
          : (
            <div className="rail-foot" style={{ padding:'16px 20px', borderTop:'2px solid rgba(10,12,8,0.15)' }}>
              <button className="btn sm brand-text" style={{ background:'var(--ink)', color:'var(--lime)', width:'100%', justifyContent:'center', clipPath:'none' }}
                onClick={() => { if (confirm('รีเซ็ตข้อมูลทั้งหมดกลับเป็นตัวอย่าง?')) store.reset(); }}>
                ↺ รีเซ็ตข้อมูล
              </button>
              <div className="label brand-text" style={{ color:'rgba(10,12,8,0.5)', marginTop:10, textAlign:'center' }}>บันทึกอัตโนมัติในเครื่อง</div>
            </div>
          )}
      </aside>

      {/* Main content */}
      <main className="main">
        <TopBar user={currentUser} role={role} store={store} go={go} />
        {v==='dashboard' && <Dashboard store={store} go={go} />}
        {v==='finance'   && <Finance   store={store} go={go} />}
        {v==='stock'     && <Stock     store={store} go={go} />}
        {v==='item'      && <ItemDetail store={store} go={go} id={route.id} />}
        {v==='reports'   && <Reports   store={store} go={go} initialTab="top" />}
        {v==='movement'  && <Reports   store={store} go={go} initialTab="movement" />}
        {v==='pos'       && <POSBridge store={store} go={go} />}
        {v==='users'     && <UserMgmt  currentUser={currentUser} currentRole={role} />}
      </main>

      {/* Tweaks panel */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="พื้นผิวกระดาษ" />
        <TweakSlider label="ความหยาบ / เกรน" value={t.rough} min={0} max={100} unit="%" onChange={v => setTweak('rough',v)} />
        <TweakSlider label="ขอบฉีก"          value={t.tornDepth ?? 72} min={0} max={100} unit="%" onChange={v => setTweak('tornDepth',v)} />
        <TweakToggle label="รอยขูดพื้นหลัง"  value={t.scratches !== false} onChange={v => setTweak('scratches',v)} />
        <TweakToggle label="เอียงกระดาษ"     value={t.tilt} onChange={v => setTweak('tilt',v)} />
        <TweakSection label="สีเน้น" />
        <TweakColor label="Accent" value={t.accent} options={['#8df731','#aaff00','#39ff14','#5fe0b7','#c6ff3a']} onChange={v => setTweak('accent',v)} />
      </TweaksPanel>

      {/* Bottom nav — mobile only */}
      <BottomNav nav={nav} activeNav={activeNav} go={go} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
