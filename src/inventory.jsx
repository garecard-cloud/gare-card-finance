/* ============================================================
   GARE CARD — Inventory: list, in/out movement, product editor
   ============================================================ */

/* ----- รับเข้า / จ่ายออก modal ----- */
function MoveModal({ store, preset, onClose }) {
  const G = window.GC;
  const s = store.state;
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = React.useState({
    productId: preset ? preset.id : (s.products[0] && s.products[0].id) || '',
    type: 'in', qty: '', unitPrice: '', date: today, note: '', toFinance: true,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const prod = G.findProduct(s, form.productId);

  React.useEffect(() => {
    if (prod) set('unitPrice', form.type === 'in' ? prod.cost : prod.price);
  }, [form.type, form.productId]);

  function submit() {
    if (!prod || !form.qty || +form.qty <= 0) return;
    if (form.type === 'out' && +form.qty > prod.qty) { if (!confirm('จำนวนจ่ายออกมากกว่าสต็อกคงเหลือ ดำเนินการต่อ?')) return; }
    store.addMovement({ ...form, qty: +form.qty, unitPrice: +form.unitPrice || 0 });
    onClose();
  }

  const total = (+form.qty || 0) * (+form.unitPrice || 0);

  return (
    <Modal title={form.type === 'in' ? 'รับสินค้าเข้า' : 'จ่ายสินค้าออก'} onClose={onClose}>
      <div className="row gap-s" style={{ marginBottom: 16 }}>
        <button className={`btn sm ${form.type === 'in' ? '' : 'paper-btn'}`} style={form.type === 'in' ? {} : { border: '1.5px solid rgba(22,23,15,0.3)' }} onClick={() => set('type', 'in')}>↓ รับเข้า (Stock In)</button>
        <button className={`btn sm ${form.type === 'out' ? 'danger' : 'paper-btn'}`} style={form.type === 'out' ? {} : { border: '1.5px solid rgba(22,23,15,0.3)' }} onClick={() => set('type', 'out')}>↑ จ่ายออก (Stock Out)</button>
      </div>

      <Field label="สินค้า">
        <select value={form.productId} onChange={e => set('productId', e.target.value)} disabled={!!preset}>
          {s.products.map(p => <option key={p.id} value={p.id}>{p.name} · คงเหลือ {p.qty}</option>)}
        </select>
      </Field>

      {prod && (
        <div className="num" style={{ fontSize: 14, color: 'var(--paper-ink-soft)', margin: '8px 0 14px' }}>
          คงเหลือปัจจุบัน <b style={{ color: 'var(--paper-ink)' }}>{prod.qty}</b> ชิ้น · {form.type === 'in' ? 'หลังรับเข้า' : 'หลังจ่ายออก'} <b style={{ color: form.type === 'in' ? 'var(--lime-deep)' : 'var(--red)' }}>{form.type === 'in' ? prod.qty + (+form.qty || 0) : prod.qty - (+form.qty || 0)}</b>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="จำนวน (ชิ้น)"><input type="number" value={form.qty} onChange={e => set('qty', e.target.value)} placeholder="0" autoFocus /></Field>
        <Field label={form.type === 'in' ? 'ราคาทุน/ชิ้น' : 'ราคาขาย/ชิ้น'}><input type="number" value={form.unitPrice} onChange={e => set('unitPrice', e.target.value)} /></Field>
        <Field label="วันที่"><input type="date" value={form.date} onChange={e => set('date', e.target.value)} /></Field>
        <Field label="หมายเหตุ"><input value={form.note} onChange={e => set('note', e.target.value)} placeholder="เช่น ล็อต / ลูกค้า" /></Field>
      </div>

      <label className="row gap-s" style={{ marginTop: 14, cursor: 'pointer', fontSize: 15, fontFamily: 'var(--font-mono)', color: 'var(--paper-ink)' }}>
        <input type="checkbox" checked={form.toFinance} onChange={e => set('toFinance', e.target.checked)} style={{ width: 16, height: 16 }} />
        บันทึกลงบัญชีการเงินด้วย ({form.type === 'in' ? 'รายจ่าย-รับสินค้า' : 'รายรับ-ขายสินค้า'} {G.money(total)})
      </label>

      <div className="row between" style={{ marginTop: 20 }}>
        <span className="num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--paper-ink)' }}>รวม {G.money(total)}</span>
        <div className="row gap-s">
          <button className="btn paper-btn" style={{ border: '1.5px solid rgba(22,23,15,0.3)' }} onClick={onClose}>ยกเลิก</button>
          <button className="btn" onClick={submit} disabled={!form.qty || +form.qty <= 0}>ยืนยัน</button>
        </div>
      </div>
    </Modal>
  );
}

/* ----- เพิ่ม/แก้ไขสินค้า ----- */
function ProductModal({ store, edit, onClose }) {
  const G = window.GC;
  const [f, setF] = React.useState(edit || {
    name: '', cat: 'cards', sku: '', cost: '', price: '', qty: '', reorder: 2,
    grade: 'RAW', gradeNum: '', supplier: '', note: '', tags: [],
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  function submit() {
    if (!f.name) return;
    const data = { ...f, cost: +f.cost || 0, price: +f.price || 0, qty: +f.qty || 0, reorder: +f.reorder || 0, gradeNum: f.gradeNum === '' ? null : +f.gradeNum };
    if (edit) store.updateProduct(edit.id, data);
    else store.addProduct(data);
    onClose();
  }

  return (
    <Modal title={edit ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'} onClose={onClose} width={620}>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="ชื่อสินค้า"><input value={f.name} onChange={e => set('name', e.target.value)} placeholder="เช่น Charizard 1999 Base Set" autoFocus /></Field>
        </div>
        <Field label="หมวดหมู่">
          <select value={f.cat} onChange={e => set('cat', e.target.value)}>
            {Object.entries(G.CATS).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="รหัส SKU"><input value={f.sku} onChange={e => set('sku', e.target.value)} placeholder="AUTO" /></Field>
        <Field label="ราคาทุน/ชิ้น"><input type="number" value={f.cost} onChange={e => set('cost', e.target.value)} /></Field>
        <Field label="ราคาขาย/ชิ้น"><input type="number" value={f.price} onChange={e => set('price', e.target.value)} /></Field>
        <Field label="จำนวนคงเหลือ"><input type="number" value={f.qty} onChange={e => set('qty', e.target.value)} /></Field>
        <Field label="แจ้งเตือนเมื่อเหลือ ≤"><input type="number" value={f.reorder} onChange={e => set('reorder', e.target.value)} /></Field>
        {f.cat === 'cards' && <>
          <Field label="เกรด">
            <select value={f.grade} onChange={e => set('grade', e.target.value)}>
              {['RAW', 'PSA', 'BGS', 'CGC', 'GARE'].map(g => <option key={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="คะแนนเกรด"><input type="number" step="0.5" value={f.gradeNum || ''} onChange={e => set('gradeNum', e.target.value)} placeholder="เช่น 9.5" disabled={f.grade === 'RAW'} /></Field>
        </>}
        <Field label="ผู้จำหน่าย/แหล่งที่มา"><input value={f.supplier} onChange={e => set('supplier', e.target.value)} /></Field>
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="โน้ต"><input value={f.note} onChange={e => set('note', e.target.value)} placeholder="สภาพ / รายละเอียดเพิ่มเติม" /></Field>
        </div>
      </div>
      {(+f.cost > 0 && +f.price > 0) && (
        <div className="num" style={{ fontSize: 15, marginTop: 14, color: 'var(--lime-deep)' }}>
          กำไร/ชิ้น {G.money(+f.price - +f.cost)} · มาร์จิน {Math.round((1 - (+f.cost) / (+f.price)) * 100)}%
        </div>
      )}
      <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <button className="btn paper-btn" style={{ border: '1.5px solid rgba(22,23,15,0.3)' }} onClick={onClose}>ยกเลิก</button>
        <button className="btn" onClick={submit} disabled={!f.name}>{edit ? 'บันทึก' : 'เพิ่มสินค้า'}</button>
      </div>
    </Modal>
  );
}

/* ----- Stock list page ----- */
function Stock({ store, go }) {
  const G = window.GC;
  const s = store.state;
  const [q, setQ] = React.useState('');
  const [cat, setCat] = React.useState('all');
  const [move, setMove] = React.useState(null);   // preset product or {}
  const [editP, setEditP] = React.useState(null);
  const [adding, setAdding] = React.useState(false);

  let list = s.products;
  if (cat !== 'all') list = list.filter(p => p.cat === cat);
  if (q.trim()) {
    const k = q.toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(k) || (p.sku || '').toLowerCase().includes(k) || (p.tags || []).join(' ').includes(k));
  }
  const sv = G.stockValue(s);

  function exportCSV() {
    const rows = [['SKU', 'ชื่อสินค้า', 'หมวดหมู่', 'เกรด', 'คงเหลือ', 'จุดสั่งซื้อ', 'ทุน/ชิ้น', 'ขาย/ชิ้น', 'มูลค่าทุน', 'มูลค่าขาย']];
    s.products.forEach(p => rows.push([p.sku, p.name, (G.CATS[p.cat] || {}).label, p.grade && p.grade !== 'RAW' ? `${p.grade} ${p.gradeNum || ''}` : 'RAW', p.qty, p.reorder, p.cost, p.price, p.qty * p.cost, p.qty * p.price]));
    G.downloadCSV(`GARECARD_สต็อก_${new Date().toISOString().slice(0,10)}.csv`, rows);
  }

  return (
    <div className="rise">
      <PageHead kicker={`คลังสินค้า · ${s.products.length} รายการ · ${sv.units} ชิ้น · มูลค่าทุน ${G.moneyShort(sv.cost)}`} title="IN" hl="VENTORY">
        <button className="btn ghost sm" onClick={exportCSV} style={{ color: 'var(--lime)' }}>⤓ CSV</button>
        <button className="btn ghost sm" onClick={() => setMove({})} style={{ color: 'var(--lime)' }}>↕ รับเข้า/จ่ายออก</button>
        <button className="btn sm" onClick={() => setAdding(true)}>+ เพิ่มสินค้า</button>
      </PageHead>

      <div className="row between wrap gap-m" style={{ marginBottom: 18 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหาชื่อ / SKU / แท็ก…" style={{ minWidth: 260, flex: 1, maxWidth: 420 }} className="on-dark-input" />
        <div className="row gap-s wrap">
          <button className={`chip ${cat === 'all' ? 'solid' : ''}`} style={chipStyle(cat === 'all')} onClick={() => setCat('all')}>ทั้งหมด</button>
          {Object.entries(G.CATS).map(([k, c]) => (
            <button key={k} className={`chip ${cat === k ? 'solid' : ''}`} style={chipStyle(cat === k)} onClick={() => setCat(k)}>{c.short}</button>
          ))}
        </div>
      </div>

      <div className="cards-row">
        {list.map((p, i) => {
          const low = p.qty <= p.reorder;
          return (
            <Paper key={p.id} tilt={['tilt-1', 'tilt-2', 'tilt-3'][i % 3]} className="tight" style={{ cursor: 'pointer' }}>
              <div onClick={() => go('item', p.id)}>
                <Thumb product={p} h={120} />
                <div className="row between" style={{ marginTop: 10 }}>
                  <CatBadge cat={p.cat} />
                  {low ? <span className="chip low">⚠ ใกล้หมด</span> : <span className="chip" style={{ opacity: 0.5 }}>OK</span>}
                </div>
                <div className="mono" style={{ fontWeight: 700, fontSize: 15, color: 'var(--paper-ink)', marginTop: 8, lineHeight: 1.25, minHeight: 34 }}>{p.name}</div>
                <div className="label" style={{ color: 'var(--paper-ink-soft)', marginTop: 4 }}>{p.sku}</div>
                <div className="row between" style={{ marginTop: 10, alignItems: 'flex-end' }}>
                  <div>
                    <div className="label" style={{ color: 'var(--paper-ink-soft)' }}>คงเหลือ</div>
                    <div className="num" style={{ fontSize: 24, fontWeight: 700, color: low ? 'var(--red)' : 'var(--paper-ink)', lineHeight: 1 }}>{p.qty}</div>
                  </div>
                  <div className="right">
                    <div className="label" style={{ color: 'var(--paper-ink-soft)' }}>ราคาขาย</div>
                    <div className="num" style={{ fontSize: 16, fontWeight: 700, color: 'var(--lime-deep)' }}>{G.money(p.price)}</div>
                  </div>
                </div>
              </div>
              <div className="row gap-s" style={{ marginTop: 12 }}>
                <button className="btn sm" style={{ flex: 1, justifyContent: 'center', fontSize: 15 }} onClick={() => setMove(p)}>↕ เคลื่อนไหว</button>
                <button className="btn paper-btn sm" style={{ border: '1.5px solid rgba(22,23,15,0.3)', fontSize: 15 }} onClick={() => setEditP(p)}>แก้ไข</button>
              </div>
            </Paper>
          );
        })}
      </div>
      {list.length === 0 && <Paper tilt="tilt-2"><Empty>ไม่พบสินค้าที่ค้นหา</Empty></Paper>}

      {move && <MoveModal store={store} preset={move.id ? move : null} onClose={() => setMove(null)} />}
      {adding && <ProductModal store={store} onClose={() => setAdding(false)} />}
      {editP && <ProductModal store={store} edit={editP} onClose={() => setEditP(null)} />}
    </div>
  );
}

function chipStyle(active) {
  return { cursor: 'pointer', padding: '6px 11px', color: active ? 'var(--ink)' : 'var(--paper)', borderColor: active ? 'var(--lime)' : 'rgba(239,233,216,0.3)' };
}

Object.assign(window, { Stock, MoveModal, ProductModal });
