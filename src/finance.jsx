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

/* ----- AI slip dropzone ----- */
function SlipReader({ onResult }) {
  const G = window.GC;
  const [over, setOver] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [preview, setPreview] = React.useState(null);
  const [status, setStatus] = React.useState(null);
  const inputRef = React.useRef();

  async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      setStatus({ err: 'ไฟล์ต้องเป็นรูปภาพ' });
      return;
    }
    const dataUrl = await fileToBase64(file);
    setPreview(dataUrl);
    setBusy(true);
    setStatus({ msg: 'AI กำลังอ่านสลิป…' });
    try {
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
      console.error('Slip error:', e);
      setStatus({ err: 'AI อ่านไม่สำเร็จ — กรอกเองด้านล่างได้เลย' });
      onResult({ slip: dataUrl });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className={`dropzone ${over ? 'over' : ''}`} onClick={() => inputRef.current?.click()} onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={e => { e.preventDefault(); setOver(false); handleFile(e.dataTransfer.files[0]); }}>
        {preview ? (
          <div className="row gap-m" style={{ alignItems: 'center', textAlign: 'left' }}>
            <img src={preview} alt="slip" style={{ width: 64, height: 64, objectFit: 'cover', border: '2px solid var(--lime)' }} />
            <div style={{ flex: 1 }}>{busy ? <div className="row gap-s" style={{ color: 'var(--lime-deep)' }}><span className="spin">◠</span> <span className="mono" style={{ fontSize: 15 }}>{status?.msg}</span></div> : <div className="mono" style={{ fontSize: 15, color: status?.err ? 'var(--red)' : 'var(--lime-deep)', fontWeight: 700 }}>{status?.ok || status?.err}</div>}</div>
          </div>
        ) : (
          <><div className="display" style={{ fontSize: 22, color: 'var(--lime-deep)' }}>⤓ ลากสลิป / ใบเสร็จมาวาง</div><div className="mono" style={{ fontSize: 14, color: 'var(--paper-ink-soft)', marginTop: 8 }}>AI จะอ่านยอดเงิน วันที่ และรายละเอียด</div></>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
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
  React.useEffect(() => { if (!cats.find(([k]) => k === form.cat)) set('cat', cats[0]?.[0]); }, [form.type]);
  function onAI(res) { setForm(f => ({ ...f, ...(res.amount != null && { amount: res.amount }), ...(res.date && { date: res.date }), ...(res.type && { type: res.type }), ...(res.note && { note: res.note }), ...(res.slip && { slip: res.slip }) })); }
  function submit() { if (!form.amount || +form.amount <= 0) return; store.addTx({ ...form, amount: +form.amount }); onClose(); }
  return (
    <Modal title="บันทึกรายการเงิน" onClose={onClose} width={580}>
      <div style={{ marginBottom: 18 }}><SlipReader onResult={onAI} /></div>
      <div className="row gap-s" style={{ marginBottom: 16 }}><button className={`btn sm ${form.type === 'income' ? '' : 'paper-btn'}`} onClick={() => set('type', 'income')}>↘ รายรับ</button><button className={`btn sm ${form.type === 'expense' ? 'danger' : 'paper-btn'}`} onClick={() => set('type', 'expense')}>↗ รายจ่าย</button></div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14 }}><Field label="จำนวนเงิน"><input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" autoFocus /></Field><Field label="วันที่"><input type="date" value={form.date} onChange={e => set('date', e.target.value)} /></Field><Field label="หมวดหมู่"><select value={form.cat} onChange={e => set('cat', e.target.value)}>{cats.map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}</select></Field><Field label="หมายเหตุ"><input value={form.note} onChange={e => set('note', e.target.value)} placeholder="รายละเอียด…" /></Field></div>
      <div className="row between" style={{ marginTop: 22 }}><span className="num" style={{ fontSize: 24, fontWeight: 700, color: form.type === 'income' ? 'var(--lime-deep)' : 'var(--red)' }}>{form.type === 'income' ? '+' : '−'}{G.money(form.amount || 0)}</span><div className="row gap-s"><button className="btn paper-btn" onClick={onClose}>ยกเลิก</button><button className="btn" onClick={submit} disabled={!form.amount || +form.amount <= 0}>บันทึก</button></div></div>
    </Modal>
  );
}

/* ----- Finance dashboard ----- */
function Finance() {
  const G = window.GC;
  const [store] = G.useStore();
  const [txModal, setTxModal] = React.useState(null);
  const txs = store?.txs?.filter(tx => G.hasPermission('finance.view')) || [];
  const byType = { income: txs.filter(t => t.type === 'income'), expense: txs.filter(t => t.type === 'expense') };
  const totals = Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, v.reduce((s, t) => s + t.amount, 0)]));
  const balance = (store?.capital || 0) + totals.income - totals.expense;
  return (
    <div className="main">
      <div className="header" style={{ marginBottom: 32 }}><div className="row between" style={{ marginBottom: 12 }}><h1>💰 FINANCE</h1>{G.hasPermission('finance.edit') && <button className="btn" onClick={() => setTxModal('tx')}>+ บันทึกรายการ</button>}</div></div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        <Card className="paper"><div className="label">ทุนตั้งต้น</div><div className="num" style={{ marginTop: 4 }}>{G.money(store?.capital || 0)}</div></Card>
        <Card className="paper"><div className="label">รายรับรวม</div><div className="num" style={{ color: 'var(--lime-deep)', marginTop: 4 }}>+{G.money(totals.income)}</div></Card>
        <Card className="paper"><div className="label">รายจ่ายรวม</div><div className="num" style={{ color: 'var(--red)', marginTop: 4 }}>−{G.money(totals.expense)}</div></Card>
        <Card className="paper"><div className="label">ยอดคงเหลือ</div><div className="num" style={{ color: balance >= 0 ? 'var(--lime-deep)' : 'var(--red)', marginTop: 4 }}>{G.money(balance)}</div></Card>
      </div>
      {G.hasPermission('finance.view') && <><h3 style={{ marginBottom: 12, marginTop: 32 }}>รายการทั้งหมด</h3><div className="table"><div className="row header"><div style={{ flex: '0 0 60px' }}>วันที่</div><div style={{ flex: 1 }}>รายละเอียด</div><div style={{ flex: '0 0 100px' }}>ยอด</div></div>{txs.map(tx => (<div key={tx.id} className="row"><div style={{ flex: '0 0 60px', fontSize: 12, color: 'var(--paper-ink-soft)' }}>{tx.date?.slice(5)}</div><div style={{ flex: 1 }}><span className="mono" style={{ marginRight: 6, color: tx.type === 'income' ? 'var(--lime-deep)' : 'var(--red)' }}>{FIN_ICON[tx.type]}</span><span>{tx.note || G.FIN_CATS[tx.cat]?.label || 'อื่น'}</span></div><div style={{ flex: '0 0 100px', textAlign: 'right', fontWeight: 600, color: tx.type === 'income' ? 'var(--lime-deep)' : 'var(--red)' }}>{tx.type === 'income' ? '+' : '−'}{G.money(tx.amount)}</div></div>))}</div></>\r}\n      {txModal === 'tx' && <TxModal store={store} onClose={() => setTxModal(null)} />}
    </div>
  );
}
