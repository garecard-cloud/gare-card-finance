/* ============================================================
   GARE CARD — shared UI primitives  (exports to window)
   ============================================================ */

/* ---- Brand mark: GARE blob mascot (simple geometry) ---- */
function Logo({ size = 38, color = '#0a0c08' }) {
  return (
    <svg width={size} height={size * 0.86} viewBox="0 0 100 86" fill="none" aria-label="GARE">
      <path d="M14 6 H86 a8 8 0 0 1 8 8 V58 a14 14 0 0 1 -14 14 H58 l-8 10 -8 -10 H20 a14 14 0 0 1 -14 -14 V14 a8 8 0 0 1 8 -8 Z"
      fill={color} />
      <rect x="24" y="26" width="20" height="20" rx="4" fill="var(--lime)" />
      <rect x="56" y="26" width="20" height="20" rx="4" fill="var(--lime)" />
      <rect x="30" y="32" width="8" height="8" rx="2" fill={color} />
      <rect x="62" y="32" width="8" height="8" rx="2" fill={color} />
      <g fill="var(--lime)">
        <rect x="34" y="54" width="9" height="11" rx="2" />
        <rect x="46" y="54" width="9" height="11" rx="2" />
        <rect x="58" y="54" width="9" height="11" rx="2" />
      </g>
    </svg>);

}

/* ---- torn paper surface (real backing element, always renders) ---- */

/* seeded torn-edge path generator */
function _tearPath(seed, side, n) {
  n = n || 34;
  const r = (i) => { const s = Math.sin(i * 127.1 * (seed + 1) + 311.7) * 43758.5; return ((s % 1) + 1) % 1; };
  const pts = [];
  if (side === 'bottom') {
    pts.push('0% 0%', '100% 0%');
    for (let i = n; i >= 0; i--) pts.push(`${(i/n*100).toFixed(1)}% ${(28 + r(i)*62).toFixed(1)}%`);
    pts.push('0% 100%');
  } else {
    pts.push('0% 100%', '100% 100%');
    for (let i = n; i >= 0; i--) pts.push(`${(i/n*100).toFixed(1)}% ${(10 + r(i)*62).toFixed(1)}%`);
    pts.push('0% 0%');
  }
  return `polygon(${pts.join(',')})`;
}

function TornEdge({ side, seed, color }) {
  const clipPath = React.useMemo(() => _tearPath(seed || 1, side || 'bottom'), [seed, side]);
  const c = color || '#efe9d8';
  const pos = (side === 'top')
    ? { top: -6, height: 26, bottom: 'auto' }
    : { bottom: -6, height: 26, top: 'auto' };
  return (
    <span aria-hidden="true" style={{
      position: 'absolute', left: -8, right: -8,
      ...pos,
      background: c,
      clipPath,
      zIndex: 1,
      pointerEvents: 'none',
      opacity: 'var(--torn-opacity,1)',
    }} />
  );
}

/* olive wrinkled tape strip */
function WrinkledTape({ style: s = {} }) {
  return (
    <div aria-hidden="true" style={{
      position: 'absolute',
      width: 110, height: 30,
      background: [
        'linear-gradient(110deg,transparent 0%,rgba(210,205,155,.45) 20%,transparent 38%,rgba(195,190,138,.3) 55%,transparent 72%,rgba(205,198,148,.38) 88%,transparent 100%)',
        'linear-gradient(180deg,rgba(220,215,165,.12) 0%,rgba(148,144,100,.22) 45%,rgba(175,170,120,.15) 70%,rgba(155,150,105,.08) 100%)',
        'rgba(158,155,108,.8)',
      ].join(','),
      clipPath: 'polygon(1% 8%, 99% 1%, 100% 88%, 97% 100%, 3% 94%, 0% 82%)',
      boxShadow: '0 3px 8px rgba(0,0,0,.45)',
      zIndex: 4,
      pointerEvents: 'none',
      ...s,
    }} />
  );
}

function Paper({ variant = '', className = '', tilt = '', style = {}, children, innerStyle = {}, torn, tape, seed, ...rest }) {
  const fillColor = variant === 'dark' ? '#12150f' : variant === 'lime' ? '#8df731' : '#efe9d8';
  const s = seed || (tilt === 'tilt-1' ? 3 : tilt === 'tilt-2' ? 7 : 11);
  return (
    <div className={`paper ${variant} ${tilt} ${className}`} style={style} {...rest}>
      <span className="paper-fill" aria-hidden="true" />
      {(torn === 'top' || torn === 'both') && <TornEdge side="top" seed={s} color={fillColor} />}
      {(torn === 'bottom' || torn === 'both') && <TornEdge side="bottom" seed={s} color={fillColor} />}
      {tape && <WrinkledTape style={tape} />}
      <div className="paper-inner" style={innerStyle}>{children}</div>
    </div>);

}

function Tape({ style = {}, paper = false }) {
  return <div className={`tape ${paper ? 'paper-tape' : ''}`} style={style} />;
}

/* ---- category + grade badges ---- */
function CatBadge({ cat, solid = false }) {
  const c = window.GC.CATS[cat] || window.GC.CATS.other;
  return <span className={`chip ${solid ? 'solid' : ''}`}>{c.short}</span>;
}
function GradeBadge({ grade, gradeNum }) {
  if (!grade || grade === 'RAW') return <span className="chip" style={{ opacity: 0.6 }}>RAW</span>;
  return <span className="chip grade">{grade} {gradeNum != null ? gradeNum : ''}</span>;
}

/* ---- striped placeholder thumbnail ---- */
function Thumb({ product, h = 150 }) {
  const c = window.GC.CATS[product.cat] || window.GC.CATS.other;
  return (
    <div style={{
      position: 'relative', height: h, overflow: 'hidden',
      background: 'repeating-linear-gradient(135deg, rgba(22,23,15,0.10) 0 8px, rgba(22,23,15,0.04) 8px 16px)',
      border: '1.5px solid rgba(22,23,15,0.2)',
      display: 'grid', placeItems: 'center'
    }}>
      <div style={{ textAlign: 'center', padding: 8 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, color: 'rgba(22,23,15,0.25)' }}>{c.code}</div>
        <div className="label" style={{ color: 'rgba(22,23,15,0.4)', marginTop: 4 }}>{c.short}</div>
      </div>
      {product.gradeNum != null &&
      <div style={{ position: 'absolute', top: 6, right: 6 }}>
          <GradeBadge grade={product.grade} gradeNum={product.gradeNum} />
        </div>
      }
    </div>);

}

/* ---- stat block ---- */
function Stat({ kicker, value, sub, tone, tilt = '', children, onClick, torn, tape }) {
  return (
    <Paper tilt={tilt} className="rise" onClick={onClick} torn={torn} tape={tape} style={onClick ? { cursor: 'pointer' } : {}}>
      <div className="label" style={{ color: 'var(--paper-ink-soft)' }}>{kicker}</div>
      <div className="stat-num" style={{ color: tone === 'pos' ? 'var(--lime-deep)' : tone === 'neg' ? 'var(--red)' : 'var(--paper-ink)', marginTop: 8 }}>
        {value}
      </div>
      {sub && <div className="num" style={{ fontSize: 14, marginTop: 8, color: 'var(--paper-ink-soft)' }}>{sub}</div>}
      {children}
    </Paper>);

}

/* ---- horizontal bars ---- */
function Bars({ data, max, fmt, color }) {
  const m = max || Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="col" style={{ gap: 12 }}>
      {data.map((d, i) =>
      <div key={i} className="col" style={{ gap: 4 }}>
          <div className="row between" style={{ fontSize: 14 }}>
            <span className="mono" style={{ color: 'var(--paper-ink)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{d.label}</span>
            <span className="num" style={{ color: 'var(--paper-ink-soft)' }}>{fmt ? fmt(d.value) : d.value}</span>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${Math.max(3, d.value / m * 100)}%`, background: color || 'var(--lime)', transition: 'width .5s cubic-bezier(.2,.8,.2,1)' }} />
          </div>
        </div>
      )}
    </div>);

}

/* ---- modal ---- */
function Modal({ title, onClose, children, width = 560 }) {
  React.useEffect(() => {
    const h = (e) => {if (e.key === 'Escape') onClose();};
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  return ReactDOM.createPortal(
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal" style={{ width: `min(${width}px, 96vw)` }} onMouseDown={(e) => e.stopPropagation()}>
        <Paper className="rise">
          <div className="row between" style={{ marginBottom: 16, alignItems: 'flex-start' }}>
            <h3 className="display" style={{ fontSize: 24, color: 'var(--paper-ink)', maxWidth: '85%' }}>{title}</h3>
            <button className="btn paper-btn sm" onClick={onClose} style={{ clipPath: 'none', border: '1.5px solid rgba(22,23,15,0.3)' }}>✕</button>
          </div>
          {children}
        </Paper>
      </div>
    </div>,
    document.body);

}

/* ---- field wrapper ---- */
function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="num" style={{ fontSize: 15, color: 'var(--paper-ink-soft)' }}>{hint}</span>}
    </label>);

}

/* ---- empty state ---- */
function Empty({ children }) {
  return (
    <div className="center muted" style={{ padding: 40, fontFamily: 'var(--font-mono)', fontSize: 15 }}>
      <img src="assets/mascot.png" alt="" style={{ width: 56, opacity: 0.16, marginBottom: 12 }} />
      <div>{children}</div>
    </div>);

}

/* ---- section heading ---- */
function PageHead({ kicker, title, hl, mascot = 'green', children }) {
  const isDark = mascot === 'dark';
  return (
    <div className="row between wrap gap-m page-head" style={{ marginBottom: 36, alignItems: 'flex-end' }}>
      <div className="row gap-m" style={{ alignItems: 'center' }}>
        <img className={`page-mascot tilt-2 ${isDark ? 'on-lime' : ''}`} src={isDark ? 'assets/mascot.png' : 'assets/mascot-green.png'} alt="GARE" />
        <div>
          <div className="label page-kicker">{kicker}</div>
          <h1 className="page-title">{title}{hl && <span className="hl">{hl}</span>}</h1>
        </div>
      </div>
      <div className="row gap-s wrap">{children}</div>
    </div>);

}

Object.assign(window, { Logo, Paper, Tape, TornEdge, WrinkledTape, CatBadge, GradeBadge, Thumb, Stat, Bars, Modal, Field, Empty, PageHead });
