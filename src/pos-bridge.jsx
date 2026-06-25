/* ============================================================
   GARE CARD — POS Integration Bridge
   Real-time Firestore listener + manual event entry
   ============================================================ */
const POS_SYSTEMS = {
  loyverse: 'Loyverse POS',
  square: 'Square',
  getpos: 'GetPos',
  omise: 'Omise',
  manual: 'Manual Entry',
  other: 'อื่น ๆ',
};

function POSStatusBadge({ connected }) {
  return (
    <span className="chip" style={{
      color: connected ? 'var(--lime-deep)' : 'var(--red)',
      borderColor: connected ? 'var(--lime-deep)' : 'var(--red)',
      background: connected ? 'rgba(141,247,49,0.1)' : 'rgba(232,85,58,0.1)',
    }}>
      {connected ? '● CONNECTED' : '○ OFFLINE'}
    </span>
  );
}

function POSBridge({ store, go }) {
  const G = window.GC;
  const s = store.state;
  const [events, setEvents] = React.useState([]);
  const [autoProcess, setAutoProcess] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('gc_pos_auto') || 'true'); } catch { return true; }
  });
  const [addModal, setAddModal] = React.useState(false);
  const [processing, setProcessing] = React.useState(null);

  // Subscribe to POS events
  React.useEffect(() => {
    if (!window.gcStore) return;
    const unsub = window.gcStore.subscribePOSEvents((evs) => {
      setEvents(evs);
      if (autoProcess) {
        evs.filter(e => !e.processed).forEach(e => processEvent(e, store, go));
      }
    });
    return () => unsub();
  }, [autoProcess]);

  const toggleAuto = (v) => {
    setAutoProcess(v);
    localStorage.setItem('gc_pos_auto', JSON.stringify(v));
  };

  async function processEvent(ev, store, go) {
    if (!ev.firestoreId || ev.processed) return;
    setProcessing(ev.firestoreId);
    try {
      if (ev.type === 'sale' || ev.type === 'เงินสด' || ev.type === 'ขาย') {
        // Create movements for each item
        for (const item of (ev.items || [])) {
          const product = s.products.find(p =>
            p.sku === item.sku || p.name.toLowerCase() === (item.name || '').toLowerCase()
          );
          if (product && item.qty > 0) {
            store.addMovement({
              productId: product.id,
              type: 'out',
              qty: +item.qty,
              unitPrice: +item.unitPrice || product.price,
              date: ev.date || new Date().toISOString().slice(0, 10),
              note: `[POS] ${ev.source || 'POS'} · ${ev.receiptId || ev.firestoreId?.slice(0, 8)}`,
              toFinance: false,
            });
          }
        }
        // Add finance income entry
        if (ev.total > 0) {
          store.addTx({
            type: 'income', cat: 'sale',
            amount: +ev.total,
            date: ev.date || new Date().toISOString().slice(0, 10),
            note: `[POS] ${ev.source || 'POS'} · ${ev.items?.length || 0} รายการ · ${ev.paymentMethod || ''}`,
          });
        }
      } else if (ev.type === 'stock_in' || ev.type === 'รับสินค้า') {
        for (const item of (ev.items || [])) {
          const product = s.products.find(p => p.sku === item.sku || p.name === item.name);
          if (product) {
            store.addMovement({
              productId: product.id, type: 'in',
              qty: +item.qty, unitPrice: +item.unitPrice || product.cost,
              date: ev.date || new Date().toISOString().slice(0, 10),
              note: `[POS] รับสินค้า · ${ev.source || ''}`,
              toFinance: true,
            });
          }
        }
      }
      await window.gcStore.markPOSProcessed(ev.firestoreId);
    } catch (e) {
      console.error('POS process error:', e);
    } finally {
      setProcessing(null);
    }
  }

  const storeId = window.gcStore?.storeId || '—';
  const projectId = (window.FIREBASE_CONFIG?.projectId || '').replace('YOUR_', '');
  const isConfigured = !!window.gcStore;

  return (
    <div className="rise">
      <PageHead kicker={`POS · เชื่อมต่อแบบ Real-time`} title="POS" hl="BRIDGE">
        <POSStatusBadge connected={isConfigured} />
        {isConfigured && <button className="btn sm" onClick={() => setAddModal(true)}>+ เพิ่ม Event</button>}
      </PageHead>

      {!isConfigured && (
        <Paper tilt="tilt-2" style={{ marginBottom: 22 }}>
          <div className="row gap-m" style={{ alignItems: 'flex-start' }}>
            <span style={{ fontSize: 28 }}>⚙</span>
            <div>
              <h3 className="display" style={{ fontSize: 20, color: 'var(--paper-ink)', marginBottom: 8 }}>ตั้งค่า Firebase ก่อน</h3>
              <p className="mono" style={{ fontSize: 14, color: 'var(--paper-ink-soft)', lineHeight: 1.6 }}>
                แก้ไข <strong>firebase-config.js</strong> ใส่ค่า Firebase ของคุณ จากนั้น POS Bridge จะทำงานได้
              </p>
            </div>
          </div>
        </Paper>
      )}

      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 22, alignItems: 'start' }}>
        {/* Left: Event log */}
        <div className="col" style={{ gap: 16 }}>
          <Paper tilt="tilt-3">
            <div className="row between" style={{ marginBottom: 16 }}>
              <h3 className="display" style={{ fontSize: 20, color: 'var(--paper-ink)' }}>📋 Event Log</h3>
              <span className="chip" style={{ color: events.filter(e => !e.processed).length ? 'var(--red)' : 'var(--lime-deep)' }}>
                {events.filter(e => !e.processed).length} รอดำเนินการ
              </span>
            </div>
            {!isConfigured || events.length === 0 ? (
              <div className="center muted mono" style={{ padding: 32, fontSize: 14 }}>
                <div style={{ marginBottom: 8, opacity: 0.4 }}>○</div>
                {isConfigured ? 'ยังไม่มี POS events — POS ของคุณต้อง write มาที่ Firestore' : 'ต้องตั้งค่า Firebase ก่อน'}
              </div>
            ) : (
              <div className="col" style={{ gap: 10, maxHeight: 480, overflow: 'auto' }}>
                {events.map(ev => (
                  <div key={ev.firestoreId} style={{ padding: '12px 0', borderBottom: '1px dashed rgba(22,23,15,0.2)' }}>
                    <div className="row between" style={{ marginBottom: 6 }}>
                      <div className="row gap-s">
                        <span className="chip" style={{ color: ev.type === 'sale' ? 'var(--lime-deep)' : 'var(--red)' }}>
                          {ev.type === 'sale' ? '↘ ขาย' : ev.type === 'stock_in' ? '↙ รับเข้า' : ev.type}
                        </span>
                        <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{ev.source || 'POS'}</span>
                      </div>
                      <div className="row gap-s">
                        {ev.processed
                          ? <span className="chip" style={{ color: 'var(--lime-deep)' }}>✓ แล้ว</span>
                          : <span className="chip low">⏳ รอ</span>}
                        {!ev.processed && isConfigured && (
                          <button className="btn sm" disabled={processing === ev.firestoreId}
                            onClick={() => processEvent(ev, store, go)}
                            style={{ fontSize: 12, padding: '5px 10px' }}>
                            {processing === ev.firestoreId ? '…' : 'นำเข้า'}
                          </button>
                        )}
                      </div>
                    </div>
                    {ev.items && ev.items.length > 0 && (
                      <div className="col" style={{ gap: 2, marginBottom: 6 }}>
                        {ev.items.slice(0, 3).map((it, i) => (
                          <div key={i} className="row between" style={{ fontSize: 13, color: 'var(--paper-ink-soft)' }}>
                            <span className="mono">{it.name} ×{it.qty}</span>
                            <span className="num">{G.money(it.total || it.qty * it.unitPrice)}</span>
                          </div>
                        ))}
                        {ev.items.length > 3 && <span className="label" style={{ color: 'var(--paper-ink-soft)' }}>+{ev.items.length - 3} รายการ</span>}
                      </div>
                    )}
                    <div className="row between">
                      <span className="label" style={{ color: 'var(--paper-ink-soft)' }}>{ev.paymentMethod || ''}</span>
                      <span className="num" style={{ fontWeight: 700, color: 'var(--lime-deep)' }}>{G.money(ev.total || 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Paper>
        </div>

        {/* Right: Settings + Setup guide */}
        <div className="col" style={{ gap: 16 }}>
          <Paper variant="dark" tilt="tilt-2">
            <h3 className="display" style={{ fontSize: 18, color: 'var(--lime)', marginBottom: 14 }}>⚙ การตั้งค่า</h3>
            <label className="row gap-s" style={{ cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-mono)', color: 'var(--paper)', marginBottom: 16 }}>
              <input type="checkbox" checked={autoProcess} onChange={e => toggleAuto(e.target.checked)} style={{ width: 16, height: 16 }} />
              นำเข้าข้อมูลอัตโนมัติเมื่อรับ Event
            </label>
            <div className="col" style={{ gap: 8, fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--paper)' }}>
              <div className="row between">
                <span style={{ color: 'rgba(239,233,216,0.55)' }}>Store ID</span>
                <span style={{ fontWeight: 700, userSelect: 'all', color: 'var(--lime)' }}>{storeId}</span>
              </div>
              <div className="row between">
                <span style={{ color: 'rgba(239,233,216,0.55)' }}>Project</span>
                <span>{projectId || '—'}</span>
              </div>
              <div className="row between">
                <span style={{ color: 'rgba(239,233,216,0.55)' }}>Collection</span>
                <span style={{ userSelect: 'all' }}>gc_stores/{storeId}/pos_events</span>
              </div>
            </div>
          </Paper>

          <Paper tilt="tilt-1">
            <h3 className="display" style={{ fontSize: 18, color: 'var(--paper-ink)', marginBottom: 12 }}>📖 วิธีเชื่อม POS</h3>
            <div className="col" style={{ gap: 10 }}>
              {[
                ['1', 'ให้ POS ส่งข้อมูลมาที่ Firestore collection:', `gc_stores/${storeId}/pos_events`],
                ['2', 'Format ของ event:', '{"type":"sale","source":"POS","total":1500,"items":[{"sku":"PKM-001","name":"Card","qty":1,"unitPrice":1500}],"paymentMethod":"cash"}'],
                ['3', 'ใช้ Zapier/Make เชื่อม POS API → Firebase', ''],
                ['4', 'หรือใช้ Firebase Admin SDK ใน POS script', ''],
              ].map(([n, label, code]) => (
                <div key={n}>
                  <div className="row gap-s" style={{ alignItems: 'flex-start' }}>
                    <span className="display" style={{ fontSize: 18, color: 'var(--lime-deep)', width: 22, flexShrink: 0 }}>{n}</span>
                    <span className="mono" style={{ fontSize: 13, color: 'var(--paper-ink)', lineHeight: 1.4 }}>{label}</span>
                  </div>
                  {code && <div className="mono" style={{ fontSize: 11, background: 'rgba(22,23,15,0.08)', padding: '6px 10px', marginTop: 4, wordBreak: 'break-all', color: 'var(--paper-ink-soft)', userSelect: 'all' }}>{code}</div>}
                </div>
              ))}
            </div>
          </Paper>
        </div>
      </div>

      {addModal && <ManualPOSModal store={store} onClose={() => setAddModal(false)} />}
    </div>
  );
}

function ManualPOSEvent({ store, onClose }) {}

function ManualPOSModal({ store, onClose }) {
  const G = window.GC;
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = React.useState({ type: 'sale', source: 'manual', total: '', paymentMethod: 'cash', date: today, items: [{ sku: '', name: '', qty: 1, unitPrice: 0 }] });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function setItem(i, k, v) {
    const items = form.items.map((it, idx) => idx === i ? { ...it, [k]: v } : it);
    setForm(f => ({ ...f, items }));
  }

  async function submit() {
    if (!window.gcStore) return;
    const total = +form.total || form.items.reduce((a, it) => a + (+it.qty * +it.unitPrice), 0);
    await window.gcStore.addPOSEvent({ ...form, total, date: form.date });
    onClose();
  }

  return (
    <Modal title="เพิ่ม POS Event แบบ Manual" onClose={onClose} width={560}>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="ประเภท">
          <select value={form.type} onChange={e => set('type', e.target.value)}>
            <option value="sale">ขาย (sale)</option>
            <option value="stock_in">รับสินค้า (stock_in)</option>
            <option value="refund">คืนสินค้า (refund)</option>
          </select>
        </Field>
        <Field label="แหล่งที่มา">
          <select value={form.source} onChange={e => set('source', e.target.value)}>
            {Object.entries(POS_SYSTEMS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="วันที่"><input type="date" value={form.date} onChange={e => set('date', e.target.value)} /></Field>
        <Field label="วิธีชำระ"><input value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)} placeholder="cash / promptpay / card" /></Field>
      </div>
      <div style={{ margin: '16px 0 8px' }}>
        <div className="label" style={{ color: 'var(--paper-ink-soft)', marginBottom: 8 }}>รายการสินค้า</div>
        {form.items.map((it, i) => (
          <div key={i} className="row gap-s" style={{ marginBottom: 8 }}>
            <input value={it.sku} onChange={e => setItem(i, 'sku', e.target.value)} placeholder="SKU" style={{ width: 90 }} />
            <input value={it.name} onChange={e => setItem(i, 'name', e.target.value)} placeholder="ชื่อสินค้า" style={{ flex: 1 }} />
            <input type="number" value={it.qty} onChange={e => setItem(i, 'qty', e.target.value)} placeholder="จำนวน" style={{ width: 64 }} />
            <input type="number" value={it.unitPrice} onChange={e => setItem(i, 'unitPrice', e.target.value)} placeholder="ราคา" style={{ width: 80 }} />
            <button onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--paper-ink-soft)', fontSize: 16 }}>✕</button>
          </div>
        ))}
        <button className="btn paper-btn sm" onClick={() => setForm(f => ({ ...f, items: [...f.items, { sku: '', name: '', qty: 1, unitPrice: 0 }] }))}
          style={{ border: '1.5px solid rgba(22,23,15,0.3)', marginTop: 4 }}>+ เพิ่มรายการ</button>
      </div>
      <Field label="ยอดรวม (บาท)">
        <input type="number" value={form.total} onChange={e => set('total', e.target.value)} placeholder="คำนวณจากรายการอัตโนมัติถ้าเว้นว่าง" />
      </Field>
      <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <button className="btn paper-btn" style={{ border: '1.5px solid rgba(22,23,15,0.3)' }} onClick={onClose}>ยกเลิก</button>
        <button className="btn" onClick={submit}>บันทึก Event</button>
      </div>
    </Modal>
  );
}
window.POSBridge = POSBridge;
