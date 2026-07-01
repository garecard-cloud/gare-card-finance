/* ============================================================
   GARE CARD — Finance ledger + AI slip reader
   ============================================================ */
const FIN_ICON = { income: '↘', expense: '↗' };

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function extractJSON(text) {
  if (!text) return null;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch (e) { return null; }
}

function extractJSONArray(text) {
  if (!text) return null;
  const m = text.match(/\[[\s\S]*\]/);
  if (m) { try { const a = JSON.parse(m[0]); if (Array.isArray(a)) return a; } catch (e) {} }
  const obj = extractJSON(text);
  if (obj) {
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.transactions)) return obj.transactions;
    if (obj.amount != null) return [obj];
  }
  return null;
}

/* ----- AI slip dropzone ----- */
function SlipReader({ onResult }) {
  const G = window.GC;
  const [over, setOver] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [preview, setPreview] = React.useState(null);
  const [status, setStatus] = React.useState(null);
  const inputRef = React.useRef();

  async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) { setStatus({ err: 'ไฟล์ต้องเป็นรูปภาพ' }); return; }
    const dataUrl = await fileToBase64(file);
    setPreview(dataUrl);
    setBusy(true);
    setStatus({ msg: 'AI กำลังอ่านสลิป…' });
    try {
      const base64 = dataUrl.split(',')[1];
      const mime = (dataUrl.match(/data:(.*?);/) || [])[1] || 'image/jpeg';
      const base64 = dataUrl.split(',')[1];
      const apiResponse = await fetch('/api/read-slip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 })
      });
      if (!apiResponse.ok) throw new Error('API request failed');
      const data = await apiResponse.json();
      if (data && data.amount) {
        setStatus({ ok: `อ่านได้ ${G.money(data.amount)}` });
        onResult({
          amount: data.amount,
          date: data.date || new Date().toISOString().slice(0, 10),
          type: data.type === 'expense' ? 'expense' : 'income',
          note: data.note || '',
          slip: dataUrl,
        });
      } else {
        setStatus({ err: 'อ่านยอดไม่ได้ — กรอกเองด้านล่างได้เลย' });
        onResult({ slip: dataUrl });
      }
    } catch (e) {
      setStatus({ err: 'AI อ่านไม่สำเร็จ — กรอกเองด้านล่างได้เลย' });
      onResult({ slip: dataUrl });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div
        className={`dropzone ${over ? 'over' : ''}`}
        onClick={() => inputRef.current.click()}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); handleFile(e.dataTransfer.files[0]); }}
      >
        {preview ? (
          <div className="row gap-m" style={{ alignItems: 'center', textAlign: 'left' }}>
            <img src={preview} alt="slip" style={{ width: 64, height: 64, objectFit: 'cover', border: '2px solid var(--lime)' }} />
            <div style={{ flex: 1 }}>
              {busy
                ? <div className="row gap-s" style={{ color: 'var(--lime-deep)' }}><span className="spin" style={{ display: 'inline-block' }}>◠</span> <span className="mono" style={{ fontSize: 15 }}>{status && status.msg}</span></div>
                : <div className="mono" style={{ fontSize: 15, color: status && status.err ? 'var(--red)' : 'var(--lime-deep)', fontWeight: 700 }}>{status && (status.ok || status.err)}</div>}
              <div className="label" style={{ marginTop: 4, color: 'var(--paper-ink-soft)' }}>คลิกเพื่อเปลี่ยนรูป</div>
            </div>
          </div>
        ) : (
          <>
            <div className="display" style={{ fontSize: 22, color: 'var(--lime-deep)' }}>⤓ ลากสลิป / ใบเสร็จมาวาง</div>
            <div className="mono" style={{ fontSize: 14, color: 'var(--paper-ink-soft)', marginTop: 8 }}>AI จะอ่านยอดเงิน วันที่ และรายละเอียดให้อัตโนมัติ</div>
            <div className="label" style={{ marginTop: 6, color: 'var(--paper-ink-soft)' }}>หรือคลิกเพื่อเลือกไฟล์</div>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
    </div>
  );
}

/* ----- Add transaction modal ----- */
function TxModal({ store, onClose }) {
  const G = window.GC;
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = React.useState({ type: 'income', cat: 'sale', amount: '', date: today, note: '', slip: null });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const cats = Object.entries(G.FIN_CATS).filter(([, c]) => c.type === form.type);
  React.useEffect(() => {
    if (!cats.find(([k]) => k === form.cat)) set('cat', cats[0][0]);
  }, [form.type]);

  function onAI(res) {
    setForm(f => ({
      ...f,
      ...(res.amount != null ? { amount: res.amount } : {}),
      ...(res.date ? { date: res.date } : {}),
      ...(res.type ? { type: res.type } : {}),
      ...(res.note ? { note: res.note } : {}),
      ...(res.slip ? { slip: res.slip } : {}),
    }));
  }

  function submit() {
    if (!form.amount || +form.amount <= 0) return;
    store.addTx({ ...form, amount: +form.amount });
    onClose();
  }

  return (
    <Modal title="บันทึกรายการเงิน" onClose={onClose} width={580}>
      <div style={{ marginBottom: 18 }}>
        <SlipReader onResult={onAI} />
      </div>
      <div className="row gap-s" style={{ marginBottom: 16 }}>
        <button className={`btn sm ${form.type === 'income' ? '' : 'paper-btn'}`} style={form.type === 'income' ? {} : { border: '1.5px solid rgba(22,23,15,0.3)' }} onClick={() => set('type', 'income')}>↘ รายรับ</button>
        <button className={`btn sm ${form.type === 'expense' ? 'danger' : 'paper-btn'}`} style={form.type === 'expense' ? {} : { border: '1.5px solid rgba(22,23,15,0.3)' }} onClick={() => set('type', 'expense')}>↗ รายจ่าย</button>
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="จำนวนเงิน (บาท)">
          <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" autoFocus />
        </Field>
        <Field label="วันที่">
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </Field>
        <Field label="หมวดหมู่">
          <select value={form.cat} onChange={e => set('cat', e.target.value)}>
            {cats.map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="หมายเหตุ">
          <input value={form.note} onChange={e => set('note', e.target.value)} placeholder="รายละเอียด…" />
        </Field>
      </div>
      <div className="row between" style={{ marginTop: 22 }}>
        <span className="num" style={{ fontSize: 24, fontWeight: 700, color: form.type === 'income' ? 'var(--lime-deep)' : 'var(--red)' }}>
          {form.type === 'income' ? '+' : '−'}{G.money(form.amount || 0)}
        </span>
        <div className="row gap-s">
          <button className="btn paper-btn" style={{ border: '1.5px solid rgba(22,23,15,0.3)' }} onClick={onClose}>ยกเลิก</button>
          <button className="btn" onClick={submit} disabled={!form.amount || +form.amount <= 0}>บันทึก</button>
        </div>
      </div>
    </Modal>
  );
}

/* ----- รับยอดรวม: AI อ่านหลายรายการ (รายรับ+รายจ่าย) ----- */
function defaultCat(type) { return type === 'income' ? 'sale' : 'misc'; }

function BulkModal({ store, onClose }) {
  const G = window.GC;
  const [over, setOver] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState(null);
  const [rows, setRows] = React.useState([]);
  const [preview, setPreview] = React.useState(null);
  const inputRef = React.useRef();
  const today = new Date().toISOString().slice(0, 10);

  async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) { setStatus({ err: 'ไฟล์ต้องเป็นรูปภาพ' }); return; }
    const dataUrl = await fileToBase64(file);
    setPreview(dataUrl);
    setBusy(true);
    setStatus({ msg: 'AI กำลังอ่านทุกรายการ…' });
    try {
      const base64 = dataUrl.split(',')[1];
      const mime = (dataUrl.match(/data:(.*?);/) || [])[1] || 'image/jpeg';
      const base64 = dataUrl.split(',')[1];
      const apiResponse = await fetch('/api/read-slip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 })
      });
      if (!apiResponse.ok) throw new Error('API request failed');
      const data = await apiResponse.json();