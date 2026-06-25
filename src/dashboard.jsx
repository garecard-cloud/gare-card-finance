/* ============================================================
   GARE CARD — Dashboard view
   ============================================================ */
function Dashboard({ store, go }) {
  const s = store.state;
  const G = window.GC;
  const [detail, setDetail] = React.useState(null);
  const t = G.totals(s);
  const sv = G.stockValue(s);
  const low = G.lowStock(s);
  const top = G.topSellers(s, 5);
  const flow = G.dailyFlow(s);
  const feed = G.movementFeed(s).slice(0, 6);
  const maxFlow = Math.max(1, ...flow.map(f => Math.max(f.income, f.expense)));

  return (
    <div className="rise">
      <PageHead kicker="GARE CARD · ภาพรวมร้าน" title="DASH" hl="BOARD">
        <button className="btn ghost sm" onClick={() => go('finance')}>+ บันทึกการเงิน</button>
        <button className="btn sm" onClick={() => go('stock')}>จัดการสต็อก →</button>
      </PageHead>

      {/* KPI row */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', marginBottom: 22 }}>
        <Stat tilt="tilt-1" onClick={() => setDetail('income')} torn="bottom" kicker="รายรับรวม" value={G.moneyShort(t.income)} tone="pos" sub={`${s.transactions.filter(x=>x.type==='income').length} รายการ`} />
        <Stat tilt="tilt-2" onClick={() => setDetail('expense')} kicker="รายจ่ายรวม" value={G.moneyShort(t.expense)} tone="neg" sub={`${s.transactions.filter(x=>x.type==='expense').length} รายการ`} />
        <Stat tilt="tilt-3" onClick={() => setDetail('profit')} kicker={t.profit >= 0 ? 'กำไรสุทธิ' : 'ขาดทุนสุทธิ'} value={G.moneyShort(t.profit)} tone={t.profit >= 0 ? 'pos' : 'neg'} sub={t.income ? `มาร์จิน ${Math.round(t.profit/t.income*100)}%` : '—'} />
        <Stat tilt="tilt-1" onClick={() => setDetail('stockvalue')} torn="top" seed={5} kicker="มูลค่าสต็อก (ทุน)" value={G.moneyShort(sv.cost)} sub={`${sv.units} ชิ้น · ขายได้ ${G.moneyShort(sv.retail)}`} />
      </div>

      <div className="g-2-1">
        {/* income vs expense chart — clickable, torn both edges */}
        <Paper tilt="tilt-3" torn="bottom" seed={9} style={{ cursor: 'pointer' }} onClick={() => setDetail('cashflow')}>
          <div className="row between" style={{ marginBottom: 16 }}>
            <div>
              <div className="label" style={{ color: 'var(--paper-ink-soft)' }}>กระแสเงิน · พ.ค. 2026</div>
              <h3 className="display" style={{ fontSize: 22, color: 'var(--paper-ink)', marginTop: 4 }}>รายรับ vs รายจ่าย</h3>
            </div>
            <div className="row gap-m" style={{ fontSize: 15 }}>
              <span className="row gap-s"><i style={{ width: 12, height: 12, background: 'var(--lime-deep)' }} /> รับ</span>
              <span className="row gap-s"><i style={{ width: 12, height: 12, background: 'var(--red)' }} /> จ่าย</span>
            </div>
          </div>
          <div className="row" style={{ alignItems: 'flex-end', gap: 10, height: 180, borderBottom: '2px solid rgba(22,23,15,0.3)', paddingBottom: 0 }}>
            {flow.map((f, i) => (
              <div key={i} className="col" style={{ flex: 1, alignItems: 'center', gap: 3, height: '100%', justifyContent: 'flex-end' }} title={`${G.fmtDate(f.date)} · รับ ${G.money(f.income)} / จ่าย ${G.money(f.expense)}`}>
                <div className="row" style={{ alignItems: 'flex-end', gap: 2, height: '100%', width: '100%', justifyContent: 'center' }}>
                  <div style={{ width: '42%', height: `${(f.income/maxFlow)*100}%`, background: 'var(--lime-deep)', minHeight: f.income ? 3 : 0 }} />
                  <div style={{ width: '42%', height: `${(f.expense/maxFlow)*100}%`, background: 'var(--red)', minHeight: f.expense ? 3 : 0 }} />
                </div>
                <span className="num" style={{ fontSize: 14, color: 'var(--paper-ink-soft)', transform: 'rotate(-45deg)', whiteSpace: 'nowrap', marginTop: 6 }}>{new Date(f.date).getDate()}</span>
              </div>
            ))}
          </div>
        </Paper>

        {/* low stock alerts */}
        <Paper variant="dark" tilt="tilt-2">
          <div className="row between" style={{ marginBottom: 14 }}>
            <h3 className="display" style={{ fontSize: 20, color: 'var(--lime)' }}>⚠ ใกล้หมด</h3>
            <span className="chip" style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>{low.length} รายการ</span>
          </div>
          {low.length === 0 ? <div className="muted-d mono" style={{ fontSize: 14 }}>สต็อกเพียงพอทุกรายการ</div> : (
            <div className="col" style={{ gap: 10 }}>
              {low.slice(0, 5).map(p => (
                <div key={p.id} className="row between" style={{ cursor: 'pointer', paddingBottom: 9, borderBottom: '1px dashed rgba(141,247,49,0.2)' }} onClick={() => go('item', p.id)}>
                  <div style={{ minWidth: 0 }}>
                    <div className="mono" style={{ fontSize: 14, color: 'var(--paper)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div className="label" style={{ color: 'rgba(239,233,216,0.45)', marginTop: 2 }}>{p.sku}</div>
                  </div>
                  <div className="num" style={{ color: 'var(--red)', fontWeight: 700, fontSize: 16 }}>{p.qty}<span style={{ fontSize: 14, color: 'rgba(239,233,216,0.4)' }}>/{p.reorder}</span></div>
                </div>
              ))}
            </div>
          )}
        </Paper>
      </div>

      <div className="g-rev-2" style={{ marginTop: 22 }}>
        {/* top sellers mini — tape on top */}
        <Paper variant="lime" tilt="tilt-1" tape={{ top: -13, left: '50%', transform: 'translateX(-50%) rotate(-2.8deg)' }}>
          <div className="row between" style={{ marginBottom: 14 }}>
            <h3 className="display" style={{ fontSize: 20, color: 'var(--ink)' }}>🔥 ขายดี TOP 5</h3>
            <button className="btn sm" onClick={() => go('reports')} style={{ background: 'var(--ink)', color: 'var(--lime)' }}>ทั้งหมด</button>
          </div>
          <div className="col" style={{ gap: 11 }}>
            {top.map((r, i) => (
              <div key={r.product.id} className="row gap-m" style={{ alignItems: 'center' }}>
                <span className="display" style={{ fontSize: 26, color: 'rgba(10,12,8,0.3)', width: 30 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.product.name}</div>
                  <div className="bar-track" style={{ marginTop: 4, background: 'rgba(10,12,8,0.15)' }}>
                    <div className="bar-fill alt" style={{ width: `${(r.qty / top[0].qty) * 100}%` }} />
                  </div>
                </div>
                <span className="num" style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{r.qty}<span style={{ fontSize: 9 }}> ชิ้น</span></span>
              </div>
            ))}
          </div>
        </Paper>

        {/* recent movements */}
        <Paper tilt="tilt-3">
          <div className="row between" style={{ marginBottom: 12 }}>
            <h3 className="display" style={{ fontSize: 20, color: 'var(--paper-ink)' }}>ความเคลื่อนไหวล่าสุด</h3>
            <button className="btn ghost sm" onClick={() => go('movement')} style={{ color: 'var(--paper-ink)', borderColor: 'rgba(22,23,15,0.3)' }}>ดูรายงาน</button>
          </div>
          <table className="tbl">
            <tbody>
              {feed.map(m => (
                <tr key={m.id}>
                  <td style={{ width: 60 }}><span className="chip" style={{ color: m.type === 'in' ? 'var(--lime-deep)' : 'var(--red)', borderColor: 'currentColor' }}>{m.type === 'in' ? 'รับเข้า' : 'จ่ายออก'}</span></td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.product ? m.product.name : '—'}</td>
                  <td className="right" style={{ fontWeight: 700, color: m.type === 'in' ? 'var(--lime-deep)' : 'var(--red)' }}>{m.type === 'in' ? '+' : '−'}{m.qty}</td>
                  <td className="right muted">{G.fmtDate(m.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Paper>
      </div>

      {detail && <DetailPopup view={detail} store={store} go={go} onClose={() => setDetail(null)} />}
    </div>
  );
}
window.Dashboard = Dashboard;
