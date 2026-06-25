/* ============================================================
   GARE CARD — Auth Screen (Firebase Google + Email login)
   ============================================================ */
function AuthScreen({ onSuccess }) {
  const [mode, setMode] = React.useState('login'); // login | register | forgot
  const [email, setEmail] = React.useState('');
  const [pass, setPass] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const [msg, setMsg] = React.useState(null);

  const clear = () => { setErr(null); setMsg(null); };

  async function googleLogin() {
    clear(); setBusy(true);
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await window.GCAuth.signInWithPopup(provider);
      onSuccess?.();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function emailLogin(e) {
    e.preventDefault(); clear(); setBusy(true);
    try {
      if (mode === 'login') {
        await window.GCAuth.signInWithEmailAndPassword(email, pass);
        onSuccess?.();
      } else if (mode === 'register') {
        await window.GCAuth.createUserWithEmailAndPassword(email, pass);
        onSuccess?.();
      } else if (mode === 'forgot') {
        await window.GCAuth.sendPasswordResetEmail(email);
        setMsg('ส่ง Email รีเซ็ตรหัสผ่านแล้ว ตรวจสอบกล่องจดหมายของคุณ');
        setMode('login');
      }
    } catch (e) {
      const map = {
        'auth/user-not-found': 'ไม่พบบัญชีนี้',
        'auth/wrong-password': 'รหัสผ่านไม่ถูกต้อง',
        'auth/email-already-in-use': 'Email นี้ถูกใช้แล้ว',
        'auth/weak-password': 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
        'auth/invalid-email': 'Email ไม่ถูกต้อง',
      };
      setErr(map[e.code] || e.message);
    } finally { setBusy(false); }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--ink)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      {/* grain overlay */}
      <div style={{ position: 'fixed', inset: 0, background: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", opacity: 0.08, mixBlendMode: 'overlay', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="assets/mascot-green.png" alt="GARE" style={{ width: 100, filter: 'drop-shadow(0 6px 18px rgba(141,247,49,0.35))' }} />
          <img src="assets/wordmark.png" alt="GARE CARD" style={{ display: 'block', width: 200, margin: '14px auto 0', filter: 'brightness(0) invert(1)' }} />
          <div className="label" style={{ color: 'rgba(239,233,216,0.45)', marginTop: 10, letterSpacing: '0.3em' }}>STOCK · FINANCE OS</div>
        </div>

        {/* Paper card */}
        <Paper tilt="tilt-1" torn="top"
          tape={{ top: -14, left: '42%', transform: 'translateX(-50%) rotate(-2.5deg)' }}>
          <div className="display" style={{ fontSize: 22, color: 'var(--paper-ink)', marginBottom: 4 }}>
            {mode === 'login' ? 'SIGN IN' : mode === 'register' ? 'REGISTER' : 'RESET PASSWORD'}
          </div>
          <div className="label" style={{ color: 'var(--paper-ink-soft)', marginBottom: 20 }}>
            {mode === 'login' ? 'เข้าสู่ระบบ GARE CARD' : mode === 'register' ? 'สร้างบัญชีใหม่' : 'ลืมรหัสผ่าน'}
          </div>

          {/* Google button */}
          {mode !== 'forgot' && (
            <button className="btn" onClick={googleLogin} disabled={busy}
              style={{ width: '100%', justifyContent: 'center', marginBottom: 16, fontSize: 15, gap: 10 }}>
              <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285f4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34a853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#fbbc05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#ea4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
              {busy ? 'กำลังเข้าสู่ระบบ…' : 'Continue with Google'}
            </button>
          )}

          {mode !== 'forgot' && (
            <div className="row gap-s" style={{ marginBottom: 16, alignItems: 'center' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(22,23,15,0.2)' }} />
              <span className="label" style={{ color: 'var(--paper-ink-soft)' }}>หรือ</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(22,23,15,0.2)' }} />
            </div>
          )}

          {/* Email form */}
          <form onSubmit={emailLogin} className="col" style={{ gap: 12 }}>
            <Field label="Email">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@garecard.com" required autoFocus />
            </Field>
            {mode !== 'forgot' && (
              <Field label="Password">
                <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" required minLength={6} />
              </Field>
            )}
            {err && <div className="mono" style={{ fontSize: 13, color: 'var(--red)', padding: '8px 10px', background: 'rgba(232,85,58,0.1)', border: '1px solid rgba(232,85,58,0.3)' }}>{err}</div>}
            {msg && <div className="mono" style={{ fontSize: 13, color: 'var(--lime-deep)', padding: '8px 10px', background: 'rgba(141,247,49,0.1)', border: '1px solid rgba(141,247,49,0.3)' }}>{msg}</div>}
            <button type="submit" className="btn" disabled={busy} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              {busy ? 'กำลังดำเนินการ…' : mode === 'login' ? 'เข้าสู่ระบบ' : mode === 'register' ? 'สร้างบัญชี' : 'ส่ง Email รีเซ็ต'}
            </button>
          </form>

          {/* Mode switchers */}
          <div className="row gap-s" style={{ marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            {mode === 'login' && <>
              <button className="btn ghost sm" onClick={() => { setMode('register'); clear(); }} style={{ clipPath: 'none', color: 'var(--paper-ink-soft)', border: 'none', background: 'none', fontSize: 13 }}>สร้างบัญชีใหม่</button>
              <span style={{ color: 'var(--paper-ink-soft)' }}>·</span>
              <button className="btn ghost sm" onClick={() => { setMode('forgot'); clear(); }} style={{ clipPath: 'none', color: 'var(--paper-ink-soft)', border: 'none', background: 'none', fontSize: 13 }}>ลืมรหัสผ่าน</button>
            </>}
            {mode !== 'login' && <button className="btn ghost sm" onClick={() => { setMode('login'); clear(); }} style={{ clipPath: 'none', color: 'var(--paper-ink-soft)', border: 'none', background: 'none', fontSize: 13 }}>← กลับหน้า Login</button>}
          </div>
        </Paper>

        <div className="label" style={{ textAlign: 'center', color: 'rgba(239,233,216,0.3)', marginTop: 20 }}>
          {!window.GCFirebaseReady && '⚠ Firebase ยังไม่ได้ตั้งค่า — แก้ไข firebase-config.js'}
        </div>
      </div>
    </div>
  );
}

function PendingScreen({ user, onLogout }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Paper tilt="tilt-2" style={{ maxWidth: 420, width: '100%' }}>
        <img src="assets/mascot-green.png" alt="" style={{ width: 64, display: 'block', margin: '0 auto 16px', opacity: 0.7 }} />
        <h2 className="display" style={{ fontSize: 26, color: 'var(--paper-ink)', textAlign: 'center', marginBottom: 10 }}>รอการอนุมัติ</h2>
        <p className="mono" style={{ fontSize: 14, color: 'var(--paper-ink-soft)', textAlign: 'center', lineHeight: 1.6 }}>
          บัญชี <strong>{user?.email}</strong> ยังไม่ได้รับสิทธิ์<br />
          กรุณาติดต่อ Admin เพื่อกำหนด Role ให้
        </p>
        <button className="btn danger sm" onClick={onLogout} style={{ margin: '20px auto 0', display: 'flex', justifyContent: 'center' }}>ออกจากระบบ</button>
      </Paper>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="col" style={{ alignItems: 'center', gap: 18 }}>
        <img src="assets/mascot-green.png" alt="" style={{ width: 80, animation: 'pulse 1.4s ease-in-out infinite' }} />
        <div className="label" style={{ color: 'rgba(239,233,216,0.45)', letterSpacing: '0.3em' }}>LOADING…</div>
        <style>{`@keyframes pulse{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.05)}}`}</style>
      </div>
    </div>
  );
}

Object.assign(window, { AuthScreen, PendingScreen, LoadingScreen });
