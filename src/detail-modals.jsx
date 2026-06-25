/* ============================================================
   GARE CARD — 5 Dashboard expand-popups
   ============================================================ */
function MiniRow({ k, v, tone }) {
  const G = window.GC;
  return (
    <div className="row between" style={{ fontSize: 15, fontFamily: 'var(--font-mono)', padding: '7px 0', borderBottom: '1px dashed rgba(22,23,15,0.18)' }}>
      <span style={{ color: 'var(--paper-ink-soft)' }}>{k}</span>
      <span style={{ fontWeight: 700, color: tone === 'pos' ? 'var(--lime-deep)' : tone === 'neg' ? 'var(--red)' : 'var(--paper-ink)' }}>{v}</span>
    </div>
  );
}

function CatBars({ data, fmt, total }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div className="col" style={{ gap: 10 }}>
      {data.map((d, i) => (
        <div key={i} className="col" style={{ gap: 3 }}>
          <div className="row between" style={{ fontSize: 14 }}>
            <span className="mono" style={{ fontWeight: 700, color: 'var(--paper-ink)' }}>{d.label}{d.count != null ? <span style={{ color: 'var(--paper-ink-soft)', fontWeight: 400 }}> · {d.count} รายการ</span> : null}</span>
            <span className="num" style={{ color: 'var(--paper-ink)' }}>{fmt(d.value)}{total ? <span style={{ color: 'var(--paper-ink-soft)' }}> ({Math.round(d.value/total*100)}%)</span> : null}</span>
          </div>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${(d.value/max)*100}%` }} /></div>
        </div>
      ))}
      {data.length === 0 && <div className="muted" style={{ fontSize: 14, fontFamily: 'var(--font-mono)' }}>ยังไม่มีข้อมูล</div>}
    </div>
  );
}

function DetailPopup({ view, store, go, onClose }) {
  const G = window.GC;
  const s = store.state;
  if (!view) return null;

  const t = G.totals(s);
  const sv = G.stockValue(s);
  let title, content, goView, goLabel;

  if (view === 'income') {
    const cats = G.txByCat(s, 'income');
    const list = s.transactions.filter(x => x.type === 'income').sort((a, b) => new Date(b.date) - new Date(a.date));
    title = 'รายรับรวม · รายละเอียด';
    goView = 'finance'; goLabel = 'ไปหน้า Finance →';
    content = (
      <div className="col" style={{ gap: 20 }}>
        <div className="row gap-l wrap">
          <div><div className="label" style={{ color: 'var(--paper-ink-soft)' }}>รายรับรวม</div><div className="stat-num pos" style={{ fontSize: 28 }}>{G.money(t.income)}</div></div>
          <div><div className="label" style={{ color: 'var(--paper-ink-soft)' }}>จำนวนรายการ</div><div className="stat-num" style={{ fontSize: 28 }}>{list.length}</div></div>
          <div><div className="label" style={{ color: 'var(--paper-ink-soft)' }}>เฉลี่ย/รายการ</div><div className="stat-num" style={{ fontSize: 28 }}>{G.money(list.length ? Math.round(t.income/list.length) : 0)}</div></div>
        </div>
        <div><div className="label" style={{ color: 'var(--paper-ink-soft)', marginBottom: 10 }}>แยกตามหมวดหมู่</div><CatBars data={cats} fmt={G.money} total={t.income} /></div>
        <div>
          <div className="label" style={{ color: 'var(--paper-ink-soft)', marginBottom: 8 }}>รายการล่าสุด</div>
          <div style={{ maxHeight: 220, overflow: 'auto' }}>
            <table className="tbl"><tbody>
              {list.slice(0, 15).map(x => (
                <tr key={x.id}>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>{G.fmtDate(x.date)}</td>
                  <td>{(G.FIN_CATS[x.cat]||{}).label||x.cat}</td>
                  <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.note||'—'}</td>
                  <td className="right pos" style={{ fontWeight: 700 }}>+{G.money(x.amount)}</td>
                </tr>
              ))}
            </tbody></table>
          </div>
        </div>
      </div>
    );
  } else if (view === 'expense') {
    const cats = G.txByCat(s, 'expense');
    const list = s.transactions.filter(x => x.type === 'expense').sort((a, b) => new Date(b.date) - new Date(a.date));
    title = 'รายจ่ายรวม · รายละเอียด';
    goView = 'finance'; goLabel = 'ไปหน้า Finance →';
    content = (
      <div className="col" style={{ gap: 20 }}>
        <div className="row gap-l wrap">
          <div><div className="label" style={{ color: 'var(--paper-ink-soft)' }}>รายจ่ายรวม</div><div className="stat-num neg" style={{ fontSize: 28 }}>{G.money(t.expense)}</div></div>
          <div><div className="label" style={{ color: 'var(--paper-ink-soft)' }}>จำนวนรายการ</div><div className="stat-num" style={{ fontSize: 28 }}>{list.length}</div></div>
          <div><div className="label" style={{ color: 'var(--paper-ink-soft)' }}>เฉลี่ย/รายการ</div><div className="stat-num" style={{ fontSize: 28 }}>{G.money(list.length ? Math.round(t.expense/list.length) : 0)}</div></div>
        </div>
        <div><div className="label" style={{ color: 'var(--paper-ink-soft)', marginBottom: 10 }}>แยกตามหมวดหมู่</div><CatBars data={cats} fmt={G.money} total={t.expense} /></div>
        <div>
          <div className="label" style={{ color: 'var(--paper-ink-soft)', marginBottom: 8 }}>รายการล่าสุด</div>
          <div style={{ maxHeight: 220, overflow: 'auto' }}>
            <table className="tbl"><tbody>
              {list.slice(0, 15).map(x => (
                <tr key={x.id}>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>{G.fmtDate(x.date)}</td>
                  <td>{(G.FIN_CATS[x.cat]||{}).label||x.cat}</td>
                  <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.note||'—'}</td>
                  <td className="right neg" style={{ fontWeight: 700 }}>−{G.money(x.amount)}</td>
                </tr>
              ))}
            </tbody></table>
          </div>
        </div>
      </div>
    );
  } else if (view === 'profit') {
    const cap = s.startingCapital || 0;
    title = (t.profit >= 0 ? 'กำไรสุทธิ' : 'ขาดทุนสุทธิ') + ' · รายละเอียด';
    goView = 'finance'; goLabel = 'ไปหน้า Finance →';
    const margin = t.income ? Math.round(t.profit / t.income * 100) : 0;
    const expPct = t.income ? Math.min(100, Math.round(t.expense / t.income * 100)) : 0;
    content = (
      <div className="col" style={{ gap: 20 }}>
        <div className="row gap-l wrap">
          <div><div className="label" style={{ color: 'var(--paper-ink-soft)' }}>รายรับรวม</div><div className="stat-num pos" style={{ fontSize: 26 }}>{G.money(t.income)}</div></div>
          <div><div className="label" style={{ color: 'var(--paper-ink-soft)' }}>รายจ่ายรวม</div><div className="stat-num neg" style={{ fontSize: 26 }}>{G.money(t.expense)}</div></div>
          <div><div className="label" style={{ color: 'var(--paper-ink-soft)' }}>{t.profit >= 0 ? 'กำไรสุทธิ' : 'ขาดทุนสุทธิ'}</div><div className={`stat-num ${t.profit >= 0 ? 'pos' : 'neg'}`} style={{ fontSize: 26 }}>{G.money(t.profit)}</div></div>
        </div>
        <div>
          <div className="row between" style={{ marginBottom: 6 }}>
            <span className="label" style={{ color: 'var(--paper-ink-soft)' }}>สัดส่วนรายจ่าย vs รายรับ</span>
            <span className="num" style={{ fontSize: 14, color: 'var(--paper-ink)' }}>มาร์จิน {margin}%</span>
          </div>
          <div className="bar-track" style={{ height: 28 }}>
            <div style={{ height: '100%', width: `${expPct}%`, background: 'var(--red)' }} />
          </div>
          <div className="num" style={{ fontSize: 15, color: 'var(--paper-ink-soft)', marginTop: 5 }}>แถบแดง = รายจ่าย {expPct}% · ส่วนที่เหลือ = กำไร</div>
        </div>
        <div className="col" style={{ gap: 0, border: '1.5px solid rgba(22,23,15,0.2)' }}>
          <MiniRow k="เงินทุนตั้งต้น" v={G.money(cap)} />
          <MiniRow k={t.profit >= 0 ? '+ กำไรสะสม' : '− ขาดทุนสะสม'} v={(t.profit >= 0 ? '+' : '') + G.money(t.profit)} tone={t.profit >= 0 ? 'pos' : 'neg'} />
          <MiniRow k="= เงินสดในมือ" v={G.money(cap + t.profit)} tone={(cap + t.profit) >= 0 ? 'pos' : 'neg'} />
        </div>
      </div>
    );
  } else if (view === 'stockvalue') {
    const cats = G.stockByCat(s);
    title = 'มูลค่าสต็อก · รายละเอียด';
    goView = 'reports'; goLabel = 'ไปหน้า Reports →';
    content = (
      <div className="col" style={{ gap: 20 }}>
        <div className="row gap-l wrap">
          <div><div className="label" style={{ color: 'var(--paper-ink-soft)' }}>มูลค่าทุน</div><div className="stat-num" style={{ fontSize: 26 }}>{G.money(sv.cost)}</div></div>
          <div><div className="label" style={{ color: 'var(--paper-ink-soft)' }}>มูลค่าขาย</div><div className="stat-num pos" style={{ fontSize: 26 }}>{G.money(sv.retail)}</div></div>
          <div><div className="label" style={{ color: 'var(--paper-ink-soft)' }}>กำไรถ้าขายหมด</div><div className="stat-num pos" style={{ fontSize: 26 }}>{G.money(sv.margin)}</div></div>
          <div><div className="label" style={{ color: 'var(--paper-ink-soft)' }}>จำนวน</div><div className="stat-num" style={{ fontSize: 26 }}>{sv.units} ชิ้น</div></div>
        </div>
        <div><div className="label" style={{ color: 'var(--paper-ink-soft)', marginBottom: 10 }}>มูลค่าทุนแยกตามหมวด</div>
          <CatBars data={cats.map(c=>({label:c.label, value:c.cost, count:c.units}))} fmt={G.money} total={sv.cost} />
        </div>
        <div style={{ maxHeight: 200, overflow: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>หมวด</th><th className="right">รายการ</th><th className="right">ชิ้น</th><th className="right">ทุน</th><th className="right">ขาย</th></tr></thead>
            <tbody>{cats.map(c=>(
              <tr key={c.cat}><td>{c.label}</td><td className="right">{c.items}</td><td className="right">{c.units}</td><td className="right">{G.money(c.cost)}</td><td className="right pos">{G.money(c.retail)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    );
  } else if (view === 'cashflow') {
    const flow = G.dailyFlow(s);
    title = 'รายรับ vs รายจ่าย · รายวัน';
    goView = 'finance'; goLabel = 'ไปหน้า Finance →';
    content = (
      <div className="col" style={{ gap: 16 }}>
        <div className="row gap-l wrap">
          <div><div className="label" style={{ color: 'var(--paper-ink-soft)' }}>รับรวม</div><div className="stat-num pos" style={{ fontSize: 26 }}>{G.money(t.income)}</div></div>
          <div><div className="label" style={{ color: 'var(--paper-ink-soft)' }}>จ่ายรวม</div><div className="stat-num neg" style={{ fontSize: 26 }}>{G.money(t.expense)}</div></div>
          <div><div className="label" style={{ color: 'var(--paper-ink-soft)' }}>สุทธิ</div><div className={`stat-num ${t.profit >= 0 ? 'pos' : 'neg'}`} style={{ fontSize: 26 }}>{G.money(t.profit)}</div></div>
        </div>
        <div style={{ maxHeight: 300, overflow: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>วันที่</th><th className="right">รับ</th><th className="right">จ่าย</th><th className="right">สุทธิวันนั้น</th></tr></thead>
            <tbody>{flow.slice().reverse().map((f, i) => {
              const net = f.income - f.expense;
              return (
                <tr key={i}>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>{G.fmtDate(f.date)}</td>
                  <td className="right pos">{f.income ? '+'+G.money(f.income) : '—'}</td>
                  <td className="right neg">{f.expense ? '−'+G.money(f.expense) : '—'}</td>
                  <td className="right" style={{ fontWeight: 700, color: net >= 0 ? 'var(--lime-deep)' : 'var(--red)' }}>{(net>=0?'+':'')+G.money(net)}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </div>
    );
  } else {
    return null;
  }

  return (
    <Modal title={title} onClose={onClose} width={640}>
      {content}
      {goView && (
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 22, borderTop: '1px dashed rgba(22,23,15,0.2)', paddingTop: 16 }}>
          <button className="btn sm" onClick={() => { onClose(); go(goView); }}>{goLabel}</button>
        </div>
      )}
    </Modal>
  );
}
window.DetailPopup = DetailPopup;
