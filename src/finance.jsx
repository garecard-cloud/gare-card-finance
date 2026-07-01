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
      const reply = await window.claude.complete({
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mime, data: base64 } },
            { type: 'text', text: 'นี่คือสลิปโอนเงิน/ใบเสร็จของร้านขายการ์ดสะสม อ่านข้อมูลแล้วตอบกลับเป็น JSON เท่านั้น ห้ามมีข้อความอื่น รูปแบบ: {"amount": ตัวเลขจำนวนเงินบาท, "date": "YYYY-MM-DD", "type": "income หรือ expense", "note": "ชื่อผู้รับ/ร้าน/รายละเอียดสั้นๆ"} ถ้าเป็นเงินเข้าให้ income ถ้าเป็นการจ่ายให้ expense ถ้าหาวันที่ไม่ได้ให้เว้นว่าง' }
          ]
        }]
      });
      const data = extractJSON(typeof reply === 'string' ? reply : (reply && reply.text) || '');
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
      const reply = await window.claude.complete({
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mime, data: base64 } },
            { type: 'text', text: 'นี่คือเอกสารสรุปยอด / สเตทเมนต์ / รายการบัญชีของร้านขายการ์ดสะสม ซึ่งอาจมีทั้งรายรับและรายจ่ายหลายรายการในรูปเดียว อ่านทุกบรรทัดที่เป็นรายการเงิน แล้วตอบกลับเป็น JSON array เท่านั้น ห้ามมีข้อความอื่นใด ๆ แต่ละสมาชิกรูปแบบ {"amount": ตัวเลขจำนวนเงินบาท (บวกเสมอ), "date": "YYYY-MM-DD", "type": "income หรือ expense", "note": "รายละเอียดสั้น ๆ"} กฎ: เงินเข้า/ขายได้/รับโอน = income, จ่าย/ซื้อ/ค่าใช้จ่าย/ถอน = expense ถ้าหาวันที่ไม่ได้ให้เว้นว่าง ถ้าไม่พบรายการเลยให้ตอบ []' }
          ]
        }]
      });
      const arr = extractJSONArray(typeof reply === 'string' ? reply : (reply && reply.text) || '');
      if (arr && arr.length) {
        const parsed = arr.filter(r => r && r.amount).map(r => ({
          type: r.type === 'expense' ? 'expense' : 'income',
          cat: defaultCat(r.type === 'expense' ? 'expense' : 'income'),
          amount: Math.abs(+r.amount) || 0,
          date: r.date || today,
          note: r.note || '',
        }));
        setRows(parsed);
        setStatus({ ok: `อ่านได้ ${parsed.length} รายการ — ตรวจ/แก้ก่อนบันทึก` });
      } else if (arr) {
        setStatus({ err: 'ไม่พบรายการเงินในรูปนี้' });
      } else {
        setStatus({ err: 'อ่านไม่สำเร็จ — เพิ่มรายการเองด้านล่างได้' });
      }
    } catch (e) {
      setStatus({ err: 'AI อ่านไม่สำเร็จ — เพิ่มรายการเองด้านล่างได้' });
    } finally {
      setBusy(false);
    }
  }

  const setRow = (i, k, v) => setRows(rs => rs.map((r, idx) => idx === i ? { ...r, [k]: v, ...(k === 'type' ? { cat: defaultCat(v) } : {}) } : r));
  const delRow = (i) => setRows(rs => rs.filter((_, idx) => idx !== i));
  const addRow = () => setRows(rs => [...rs, { type: 'income', cat: 'sale', amount: '', date: today, note: '' }]);

  const valid = rows.filter(r => +r.amount > 0);
  const inc = valid.filter(r => r.type === 'income').reduce((a, r) => a + +r.amount, 0);
  const exp = valid.filter(r => r.type === 'expense').reduce((a, r) => a + +r.amount, 0);

  function commit() {
    if (!valid.length) return;
    store.addManyTx(valid.map(r => ({ ...r, amount: +r.amount })));
    onClose();
  }

  return (
    <Modal title="รับยอดรวม · AI อ่านหลายรายการ" onClose={onClose} width={760}>
      <div
        className={`dropzone ${over ? 'over' : ''}`}
        onClick={() => inputRef.current.click()}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); handleFile(e.dataTransfer.files[0]); }}
        style={{ marginBottom: 16 }}
      >
        {preview ? (
          <div className="row gap-m" style={{ alignItems: 'center', textAlign: 'left' }}>
            <img src={preview} alt="doc" style={{ width: 64, height: 64, objectFit: 'cover', border: '2px solid var(--lime)' }} />
            <div style={{ flex: 1 }}>
              {busy
                ? <div className="row gap-s" style={{ color: 'var(--lime-deep)' }}><span className="spin" style={{ display: 'inline-block' }}>◠</span> <span className="mono" style={{ fontSize: 15 }}>{status && status.msg}</span></div>
                : <div className="mono" style={{ fontSize: 15, color: status && status.err ? 'var(--red)' : 'var(--lime-deep)', fontWeight: 700 }}>{status && (status.ok || status.err)}</div>}
              <div className="label" style={{ marginTop: 4, color: 'var(--paper-ink-soft)' }}>คลิกเพื่อเปลี่ยนรูป</div>
            </div>
          </div>
        ) : (
          <>
            <div className="display" style={{ fontSize: 22, color: 'var(--lime-deep)' }}>⇊ ลากสเตทเมนต์ / สรุปยอดมาวาง</div>
            <div className="mono" style={{ fontSize: 14, color: 'var(--paper-ink-soft)', marginTop: 8 }}>AI จะอ่านทุกรายการ ทั้งรายรับและรายจ่าย แยกให้อัตโนมัติ</div>
            <div className="label" style={{ marginTop: 6, color: 'var(--paper-ink-soft)' }}>หรือคลิกเพื่อเลือกไฟล์</div>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />

      {rows.length > 0 && (
        <div style={{ maxHeight: '40vh', overflow: 'auto', marginBottom: 14, border: '1.5px solid rgba(22,23,15,0.2)' }}>
          <table className="tbl">
            <thead>
              <tr><th>ประเภท</th><th>หมวดหมู่</th><th>วันที่</th><th className="right">จำนวน</th><th>หมายเหตุ</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const cats = Object.entries(G.FIN_CATS).filter(([, c]) => c.type === r.type);
                return (
                  <tr key={i}>
                    <td>
                      <button className="chip" style={{ cursor: 'pointer', padding: '5px 9px', color: r.type === 'income' ? 'var(--lime-deep)' : 'var(--red)', borderColor: 'currentColor' }}
                        onClick={() => setRow(i, 'type', r.type === 'income' ? 'expense' : 'income')}>
                        {r.type === 'income' ? '↘ รับ' : '↗ จ่าย'}
                      </button>
                    </td>
                    <td>
                      <select value={r.cat} onChange={e => setRow(i, 'cat', e.target.value)} style={{ padding: '4px 6px', fontSize: 14, maxWidth: 130 }}>
                        {cats.map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
                      </select>
                    </td>
                    <td><input type="date" value={r.date} onChange={e => setRow(i, 'date', e.target.value)} style={{ padding: '4px 6px', fontSize: 14 }} /></td>
                    <td className="right"><input type="number" value={r.amount} onChange={e => setRow(i, 'amount', e.target.value)} style={{ padding: '4px 6px', fontSize: 14, width: 90, textAlign: 'right' }} /></td>
                    <td><input value={r.note} onChange={e => setRow(i, 'note', e.target.value)} placeholder="—" style={{ padding: '4px 6px', fontSize: 14, width: 150 }} /></td>
                    <td className="right"><button onClick={() => delRow(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--paper-ink-soft)', fontSize: 14 }}>✕</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="row between wrap gap-s" style={{ marginTop: 6 }}>
        <button className="btn paper-btn sm" style={{ border: '1.5px solid rgba(22,23,15,0.3)' }} onClick={addRow}>+ เพิ่มแถว</button>
        {rows.length > 0 && (
          <div className="num" style={{ fontSize: 15, color: 'var(--paper-ink)' }}>
            <span className="pos">รับ {G.money(inc)}</span> · <span className="neg">จ่าย {G.money(exp)}</span> · สุทธิ <b>{G.money(inc - exp)}</b>
          </div>
        )}
      </div>

      <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
        <button className="btn paper-btn" style={{ border: '1.5px solid rgba(22,23,15,0.3)' }} onClick={onClose}>ยกเลิก</button>
        <button className="btn" onClick={commit} disabled={!valid.length}>บันทึกทั้งหมด ({valid.length})</button>
      </div>
    </Modal>
  );
}

/* ----- Finance page ----- */
function Finance({ store }) {
  const G = window.GC;
  const s = store.state;
  const [modal, setModal] = React.useState(false);
  const [bulk, setBulk] = React.useState(false);
  const [filter, setFilter] = React.useState('all');     // all | income | expense
  const [periodMode, setPeriodMode] = React.useState('all'); // all | month | year
  const [selMonth, setSelMonth] = React.useState(() => new Date().toISOString().slice(0,7)); // YYYY-MM
  const [selYear, setSelYear] = React.useState(() => String(new Date().getFullYear()));

  // Derive available months & years from transactions
  const allDates = s.transactions.map(x => x.date).filter(Boolean).sort();
  const months = [...new Set(allDates.map(d => d.slice(0,7)))].reverse();
  const years  = [...new Set(allDates.map(d => d.slice(0,4)))].reverse();

  // Period-filtered transactions
  let periodList = [...s.transactions];
  if (periodMode === 'month') periodList = periodList.filter(x => (x.date||'').startsWith(selMonth));
  if (periodMode === 'year')  periodList = periodList.filter(x => (x.date||'').startsWith(selYear));

  // Type filter on top of period filter
  let list = [...periodList].sort((a, b) => new Date(b.date) - new Date(a.date) || b.id.localeCompare(a.id));
  if (filter !== 'all') list = list.filter(x => x.type === filter);

  // KPIs for selected period
  const tPeriod = (() => {
    let inc = 0, exp = 0;
    for (const x of periodList) { if (x.type==='income') inc += +x.amount||0; else exp += +x.amount||0; }
    return { income: inc, expense: exp, profit: inc - exp };
  })();
  const tAll = G.totals(s);
  const t = periodMode === 'all' ? tAll : tPeriod;

  function periodLabel() {
    if (periodMode === 'month') { const [y,m] = selMonth.split('-'); return `${m}/${y}`; }
    if (periodMode === 'year')  return selYear;
    return 'ทั้งหมด';
  }

  function exportCSV() {
    const rows = [['วันที่', 'ประเภท', 'หมวดหมู่', 'หมายเหตุ', 'รายรับ', 'รายจ่าย']];
    [...periodList].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(x => {
      rows.push([x.date, x.type === 'income' ? 'รายรับ' : 'รายจ่าย', (G.FIN_CATS[x.cat] || {}).label || x.cat, x.note, x.type === 'income' ? x.amount : '', x.type === 'expense' ? x.amount : '']);
    });
    rows.push([]);
    if (periodMode === 'all') rows.push(['', '', '', 'เงินทุนตั้งต้น', s.startingCapital, '']);
    rows.push(['', '', '', 'รวมรายรับ', t.income, '']);
    rows.push(['', '', '', 'รวมรายจ่าย', '', t.expense]);
    rows.push(['', '', '', t.profit >= 0 ? 'กำไรสุทธิ' : 'ขาดทุนสุทธิ', t.profit, '']);
    if (periodMode === 'all') rows.push(['', '', '', 'เงินสดในมือ (ทุน+กำไร)', s.startingCapital + tAll.profit, '']);
    G.downloadCSV(`GARECARD_การเงิน_${periodLabel()}_${new Date().toISOString().slice(0,10)}.csv`, rows);
  }

  return (
    <div className="rise">
      <PageHead kicker="บัญชีรายรับ-รายจ่าย" title="FI" hl="NANCE">
        <button className="btn ghost sm" onClick={exportCSV} style={{ color: 'var(--lime)' }}>⤓ Export CSV</button>
        <button className="btn ghost sm" onClick={() => setBulk(true)} style={{ color: 'var(--lime)' }}>⇊ รับยอดรวม (AI)</button>
        <button className="btn sm" onClick={() => setModal(true)}>+ บันทึกรายการ</button>
      </PageHead>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', marginBottom: 24 }}>
        {periodMode === 'all' && <Stat tilt="tilt-1" kicker="เงินทุนตั้งต้น" value={G.money(s.startingCapital)} sub="ทุนเริ่มกิจการ" />}
        <Stat tilt="tilt-2" kicker={`รายรับ${periodMode!=='all'?' · '+periodLabel():''}`} value={G.money(t.income)} tone="pos" />
        <Stat tilt="tilt-3" kicker={`รายจ่าย${periodMode!=='all'?' · '+periodLabel():''}`} value={G.money(t.expense)} tone="neg" />
        <Stat tilt="tilt-1" kicker={t.profit >= 0 ? 'กำไรสุทธิ' : 'ขาดทุนสุทธิ'} value={G.money(t.profit)} tone={t.profit >= 0 ? 'pos' : 'neg'}
          sub={t.income ? `อัตรากำไร ${Math.round(t.profit / t.income * 100)}%` : '—'} />
        {periodMode === 'all' && <Stat tilt="tilt-2" kicker="เงินสดในมือ" value={G.money(s.startingCapital + tAll.profit)} tone={(s.startingCapital + tAll.profit) >= 0 ? 'pos' : 'neg'} sub="ทุน + กำไรสะสม" />}
      </div>

      {/* Period + Type filter bar */}
      <div className="row between wrap gap-m" style={{ marginBottom: 16, alignItems: 'center' }}>
        {/* Type chips */}
        <div className="row gap-s">
          {[['all','ทั้งหมด'],['income','รายรับ'],['expense','รายจ่าย']].map(([k,lab]) => (
            <button key={k} className={`chip ${filter===k?'solid':''}`} style={{ cursor:'pointer', padding:'7px 14px', fontSize:14, fontWeight:700, background:filter===k?'var(--lime)':'transparent', color:filter===k?'var(--ink)':'var(--lime)', borderColor:'var(--lime)' }} onClick={() => setFilter(k)}>{lab}</button>
          ))}
        </div>
        {/* Period dropdown group */}
        <div className="row gap-s" style={{ alignItems: 'center' }}>
          {[['all','ทั้งหมด'],['month','รายเดือน'],['year','รายปี']].map(([k,lab]) => (
            <button key={k} className="chip" style={{ cursor:'pointer', padding:'6px 12px', fontSize:13, fontWeight:700, background:periodMode===k?'rgba(239,233,216,0.12)':'transparent', color:periodMode===k?'var(--paper)':'rgba(239,233,216,0.45)', borderColor:periodMode===k?'rgba(239,233,216,0.5)':'rgba(239,233,216,0.2)' }} onClick={() => setPeriodMode(k)}>{lab}</button>
          ))}
          {periodMode === 'month' && (
            <select value={selMonth} onChange={e => setSelMonth(e.target.value)}
              style={{ padding:'5px 10px', fontFamily:'var(--font-mono)', fontSize:13, color:'var(--paper)', background:'rgba(10,12,8,0.7)', border:'1.5px solid rgba(239,233,216,0.3)', cursor:'pointer' }}>
              {months.length === 0 && <option value={selMonth}>{selMonth}</option>}
              {months.map(m => { const [y,mo]=m.split('-'); return <option key={m} value={m}>{mo}/{y}</option>; })}
            </select>
          )}
          {periodMode === 'year' && (
            <select value={selYear} onChange={e => setSelYear(e.target.value)}
              style={{ padding:'5px 10px', fontFamily:'var(--font-mono)', fontSize:13, color:'var(--paper)', background:'rgba(10,12,8,0.7)', border:'1.5px solid rgba(239,233,216,0.3)', cursor:'pointer' }}>
              {years.length === 0 && <option value={selYear}>{selYear}</option>}
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
          {periodMode !== 'all' && (
            <span className="label" style={{ color:'rgba(239,233,216,0.5)' }}>{list.length} รายการ</span>
          )}
        </div>
      </div>

      <Paper tilt="tilt-3">
        {list.length === 0 ? <Empty>ยังไม่มีรายการ — กด “บันทึกรายการ” เพื่อเริ่ม</Empty> : (
          <table className="tbl">
            <thead>
              <tr><th>วันที่</th><th>หมวดหมู่</th><th>หมายเหตุ</th><th></th><th className="right">จำนวน</th><th></th></tr>
            </thead>
            <tbody>
              {list.map(x => (
                <tr key={x.id}>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>{G.fmtDate(x.date)}</td>
                  <td>{(G.FIN_CATS[x.cat] || {}).label || x.cat}</td>
                  <td style={{ maxWidth: 260 }}>
                    <span className="row gap-s">
                      {x.slip && <span title="มีสลิปแนบ" style={{ color: 'var(--lime-deep)' }}>📎</span>}
                      {x.note || '—'}
                    </span>
                  </td>
                  <td><span className="chip" style={{ color: x.type === 'income' ? 'var(--lime-deep)' : 'var(--red)' }}>{x.type === 'income' ? 'รับ' : 'จ่าย'}</span></td>
                  <td className="right" style={{ fontWeight: 700, color: x.type === 'income' ? 'var(--lime-deep)' : 'var(--red)' }}>{x.type === 'income' ? '+' : '−'}{G.money(x.amount)}</td>
                  <td className="right"><button onClick={() => store.delTx(x.id)} title="ลบ" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--paper-ink-soft)', fontSize: 14 }}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Paper>

      {modal && <TxModal store={store} onClose={() => setModal(false)} />}
      {bulk && <BulkModal store={store} onClose={() => setBulk(false)} />}
    </div>
  );
}
window.Finance = Finance;
