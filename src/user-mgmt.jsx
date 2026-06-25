/* ============================================================
   GARE CARD — User Management (Admin only)
   ============================================================ */
const ROLES = {
  admin: { label: 'Admin', desc: 'เข้าถึงได้ทุกส่วน', color: 'var(--lime-deep)' },
  staff: { label: 'Staff', desc: 'บันทึกข้อมูลได้ ไม่เห็นรายงานการเงิน', color: 'var(--paper-ink)' },
  viewer: { label: 'Viewer', desc: 'ดูได้อย่างเดียว', color: 'var(--paper-ink-soft)' },
};

function UserMgmt({ currentUser, currentRole }) {
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [savingUid, setSavingUid] = React.useState(null);

  React.useEffect(() => {
    if (!window.gcStore) { setLoading(false); return; }
    window.gcStore.getUsers().then(u => { setUsers(u); setLoading(false); });
  }, []);

  async function changeRole(uid, role) {
    if (!window.gcStore) return;
    setSavingUid(uid);
    await window.gcStore.setUser(uid, { role });
    setUsers(u => u.map(x => x.uid === uid ? { ...x, role } : x));
    setSavingUid(null);
  }

  async function removeUser(uid) {
    if (uid === currentUser?.uid) { alert('ไม่สามารถลบตัวเองออกได้'); return; }
    if (!confirm('ยืนยันการลบผู้ใช้นี้?')) return;
    await window.gcStore?.removeUser(uid);
    setUsers(u => u.filter(x => x.uid !== uid));
  }

  const storeId = window.gcStore?.storeId || '—';

  return (
    <div className="rise">
      <PageHead kicker="จัดการสิทธิ์ผู้ใช้งาน" title="USERS" hl="" />

      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 22, alignItems: 'start' }}>
        <Paper tilt="tilt-3">
          <div className="row between" style={{ marginBottom: 16 }}>
            <h3 className="display" style={{ fontSize: 20, color: 'var(--paper-ink)' }}>ผู้ใช้ทั้งหมด</h3>
            <span className="chip">{users.length} คน</span>
          </div>
          {loading && <div className="mono muted" style={{ fontSize: 14, padding: '16px 0' }}>กำลังโหลด…</div>}
          {!loading && !window.gcStore && (
            <div className="mono muted" style={{ fontSize: 14, padding: 16, textAlign: 'center' }}>Firebase ยังไม่ได้ตั้งค่า</div>
          )}
          {!loading && window.gcStore && users.length === 0 && (
            <div className="mono muted" style={{ fontSize: 14, padding: 16, textAlign: 'center' }}>ยังไม่มีผู้ใช้</div>
          )}
          <div className="col" style={{ gap: 12 }}>
            {users.map(u => {
              const role = ROLES[u.role] || ROLES.staff;
              const isMe = u.uid === currentUser?.uid;
              return (
                <div key={u.uid} style={{ padding: '12px 0', borderBottom: '1px dashed rgba(22,23,15,0.2)' }}>
                  <div className="row between" style={{ marginBottom: 8 }}>
                    <div className="row gap-m" style={{ alignItems: 'center' }}>
                      {u.photoURL
                        ? <img src={u.photoURL} alt="" style={{ width: 36, height: 36, borderRadius: 18, border: '2px solid var(--paper-edge)' }} />
                        : <div style={{ width: 36, height: 36, borderRadius: 18, background: 'var(--paper-edge)', display: 'grid', placeItems: 'center' }}>
                            <span className="display" style={{ fontSize: 16, color: 'var(--paper-ink)' }}>{(u.displayName || u.email || '?')[0].toUpperCase()}</span>
                          </div>}
                      <div>
                        <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--paper-ink)' }}>
                          {u.displayName || u.email} {isMe && <span className="chip" style={{ fontSize: 10 }}>คุณ</span>}
                        </div>
                        <div className="label" style={{ color: 'var(--paper-ink-soft)', marginTop: 2 }}>{u.email}</div>
                      </div>
                    </div>
                    <span className="chip" style={{ color: role.color, borderColor: role.color }}>{role.label}</span>
                  </div>
                  {currentRole === 'admin' && !isMe && (
                    <div className="row gap-s" style={{ marginTop: 6 }}>
                      {Object.entries(ROLES).map(([r, info]) => (
                        <button key={r} className="chip" disabled={savingUid === u.uid}
                          style={{ cursor: 'pointer', padding: '5px 10px', fontSize: 11, color: u.role === r ? 'var(--ink)' : 'var(--paper-ink)', background: u.role === r ? 'var(--lime)' : 'transparent', borderColor: u.role === r ? 'var(--lime)' : 'rgba(22,23,15,0.25)' }}
                          onClick={() => changeRole(u.uid, r)}>
                          {savingUid === u.uid ? '…' : info.label}
                        </button>
                      ))}
                      <button className="chip" onClick={() => removeUser(u.uid)}
                        style={{ cursor: 'pointer', padding: '5px 10px', fontSize: 11, color: 'var(--red)', borderColor: 'var(--red)' }}>ลบ</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Paper>

        <div className="col" style={{ gap: 16 }}>
          <Paper variant="dark" tilt="tilt-2">
            <h3 className="display" style={{ fontSize: 18, color: 'var(--lime)', marginBottom: 14 }}>วิธีเพิ่มผู้ใช้</h3>
            <div className="col" style={{ gap: 10 }}>
              {[
                ['1', 'ส่ง URL ของแอปนี้ให้ผู้ใช้ใหม่'],
                ['2', 'ให้เขา Login ด้วย Google หรือ Email'],
                ['3', 'Admin กลับมาหน้านี้ แล้วกำหนด Role'],
              ].map(([n, t]) => (
                <div key={n} className="row gap-m">
                  <span className="display" style={{ fontSize: 20, color: 'var(--lime)', width: 22 }}>{n}</span>
                  <span className="mono" style={{ fontSize: 14, color: 'var(--paper)' }}>{t}</span>
                </div>
              ))}
            </div>
          </Paper>
          <Paper tilt="tilt-1">
            <h3 className="display" style={{ fontSize: 18, color: 'var(--paper-ink)', marginBottom: 12 }}>สิทธิ์แต่ละ Role</h3>
            {Object.entries(ROLES).map(([r, info]) => (
              <div key={r} style={{ padding: '8px 0', borderBottom: '1px dashed rgba(22,23,15,0.18)' }}>
                <div className="row between">
                  <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: info.color }}>{info.label}</span>
                </div>
                <div className="mono" style={{ fontSize: 13, color: 'var(--paper-ink-soft)', marginTop: 3 }}>{info.desc}</div>
              </div>
            ))}
          </Paper>
          <Paper variant="lime" tilt="tilt-3">
            <div className="label" style={{ color: 'var(--ink)', marginBottom: 6 }}>Store ID (แชร์ให้ทีม)</div>
            <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', userSelect: 'all', wordBreak: 'break-all' }}>{storeId}</div>
          </Paper>
        </div>
      </div>
    </div>
  );
}
window.UserMgmt = UserMgmt;
