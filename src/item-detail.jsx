/* ============================================================
   GARE CARD — Item detail page
   ============================================================ */
function ItemDetail({ store, go, id }) {
  const G = window.GC;
  const s = store.state;
  const p = G.findProduct(s, id);
  const [move, setMove] = React.useState(false);
  const [edit, setEdit] = React.useState(false);

  if (!p) return (
    <div className="rise">
      <button className="btn ghost sm" onClick={() => go('stock')} style={{ color: 'var(--lime)', marginBottom: 20 }}>← กลับสต็อก</button>
      <Paper tilt="tilt-2"><Empty>ไม่พบสินค้านี้ (อาจถูกลบไปแล้ว)</Empty></Paper>
    </div>
  );

  const feed = G.movementFeed(s, id);
  const inQty = feed.filter(m => m.type === 'in').reduce((a, m) => a + m.qty, 0);
  const outQty = feed.filter(m => m.type === 'out').reduce((a, m) => a + m.qty, 0);
  const revenue = feed.filter(m => m.type === 'out').reduce((a, m) => a + m.qty * (m.unitPrice || p.price), 0);
  const profitUnit = p.price - p.cost;
  const margin = p.price ? Math.round(profitUnit / p.price * 100) : 0;
  const low = p.qty <= p.reorder;
  const c = G.CATS[p.cat] || G.CATS.other;

  function exportCSV() {
    const rows = [['วันที่', 'ประเภท', 'จำนวน', 'ราคา/ชิ้น', 'รวม', 'หมายเหตุ']];
    [...feed].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(m => rows.push([m.date, m.type === 'in' ? 'รับเข้า' : 'จ่ายออก', m.qty, m.unitPrice, m.qty * m.unitPrice, m.note]));
    G.downloadCSV(`GARECARD_${p.sku || p.id}.csv`, rows);
  }

  return (
    <div className="rise">
      <div className="row between wrap gap-m" style={{ marginBottom: 22 }}>
        <button className="btn ghost sm" onClick={() => go('stock')} style={{ color: 'var(--lime)' }}>← กลับสต็อก</button>
        <div className="row gap-s">
          <button className="btn ghost sm" onClick={exportCSV} style={{ color: 'var(--lime)' }}>⤓ CSV</button>
          <button className="btn paper-btn sm" style={{ border: '1.5px solid rgba(239,233,216,0.3)', background: 'transparent', color: 'var(--paper)' }} onClick={() => setEdit(true)}>แก้ไข</button>
          <button className="btn sm" onClick={() => setMove(true)}>↕ รับเข้า/จ่ายออก</button>
        </div>
      </div>

      <div className="g-detail">
        {/* left: identity card */}
        <Paper tilt="tilt-1">
          <Tape style={{ top: -12, left: '50%', transform: 'translateX(-50%) rotate(-3deg)' }} />
          <Thumb product={p} h={230} />
          <div className="row between" style={{ marginTop: 14 }}>
            <CatBadge cat={p.cat} solid />
            <GradeBadge grade={p.grade} gradeNum={p.gradeNum} />
          </div>
          <h2 className="display" style={{ fontSize: 24, color: 'var(--paper-ink)', marginTop: 12, lineHeight: 1 }}>{p.name}</h2>
          <div className="label" style={{ color: 'var(--paper-ink-soft)', marginTop: 8 }}>SKU · {p.sku || '—'}</div>
          {p.note && <p className="mono" style={{ fontSize: 14, color: 'var(--paper-ink-soft)', marginTop: 12, lineHeight: 1.5 }}>{p.note}</p>}
          <div className="col" style={{ gap: 8, marginTop: 14, borderTop: '1px dashed rgba(22,23,15,0.25)', paddingTop: 14 }}>
            <Row k="ผู้จำหน่าย" v={p.supplier || '—'} />
            <Row k="ราคาทุน/ชิ้น" v={G.money(p.cost)} />
            <Row k="ราคาขาย/ชิ้น" v={G.money(p.price)} vColor="var(--lime-deep)" />
            <Row k="กำไร/ชิ้น" v={`${G.money(profitUnit)} (${margin}%)`} vColor={profitUnit >= 0 ? 'var(--lime-deep)' : 'var(--red)'} />
          </div>
          <button className="btn danger sm" style={{ marginTop: 16, width: '100%', justifyContent: 'center' }} onClick={() => { if (confirm(`ลบ "${p.name}" และประวัติทั้งหมด?`)) { store.delProduct(p.id); go('stock'); } }}>ลบสินค้านี้</button>
        </Paper>

        {/* right: stats + history */}
        <div className="col" style={{ gap: 22 }}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
            <Stat tilt="tilt-2" kicker="คงเหลือ" value={p.qty} tone={low ? 'neg' : undefined} sub={`จุดเตือน ≤ ${p.reorder}`} />
            <Stat tilt="tilt-3" kicker="รับเข้าสะสม" value={inQty} tone="pos" />
            <Stat tilt="tilt-1" kicker="จ่ายออกสะสม" value={outQty} tone="neg" />
            <Stat tilt="tilt-2" kicker="ยอดขายรวม" value={G.moneyShort(revenue)} />
          </div>

          {/* stock gauge */}
          <Paper tilt="tilt-3">
            <div className="row between" style={{ marginBottom: 8 }}>
              <div className="label" style={{ color: 'var(--paper-ink-soft)' }}>ระดับสต็อก</div>
              <div className="num" style={{ fontSize: 14, color: low ? 'var(--red)' : 'var(--paper-ink-soft)' }}>{low ? 'ต้องสั่งเพิ่ม' : 'ปกติ'}</div>
            </div>
            <div className="bar-track" style={{ height: 26 }}>
              <div className="bar-fill" style={{ width: `${Math.min(100, (p.qty / Math.max(p.reorder * 3, p.qty, 1)) * 100)}%`, background: low ? 'var(--red)' : 'var(--lime)' }} />
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${Math.min(100, (p.reorder / Math.max(p.reorder * 3, p.qty, 1)) * 100)}%`, borderLeft: '2px dashed rgba(22,23,15,0.6)' }} title="จุดสั่งซื้อ" />
            </div>
            <div className="num" style={{ fontSize: 15, color: 'var(--paper-ink-soft)', marginTop: 6 }}>เส้นประ = จุดสั่งซื้อ ({p.reorder})</div>
          </Paper>

          {/* movement history */}
          <Paper tilt="tilt-1">
            <h3 className="display" style={{ fontSize: 20, color: 'var(--paper-ink)', marginBottom: 12 }}>ประวัติเคลื่อนไหว</h3>
            {feed.length === 0 ? <Empty>ยังไม่มีการเคลื่อนไหว</Empty> : (
              <table className="tbl">
                <thead><tr><th>วันที่</th><th>ประเภท</th><th className="right">จำนวน</th><th className="right">ราคา/ชิ้น</th><th className="right">รวม</th><th>หมายเหตุ</th><th></th></tr></thead>
                <tbody>
                  {feed.map(m => (
                    <tr key={m.id}>
                      <td className="muted" style={{ whiteSpace: 'nowrap' }}>{G.fmtDate(m.date)}</td>
                      <td><span className="chip" style={{ color: m.type === 'in' ? 'var(--lime-deep)' : 'var(--red)' }}>{m.type === 'in' ? 'รับเข้า' : 'จ่ายออก'}</span></td>
                      <td className="right" style={{ fontWeight: 700, color: m.type === 'in' ? 'var(--lime-deep)' : 'var(--red)' }}>{m.type === 'in' ? '+' : '−'}{m.qty}</td>
                      <td className="right">{G.money(m.unitPrice)}</td>
                      <td className="right">{G.money(m.qty * m.unitPrice)}</td>
                      <td className="muted" style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.note || '—'}</td>
                      <td className="right"><button onClick={() => { if (confirm('ลบรายการนี้ และปรับสต็อกกลับ?')) store.delMovement(m.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--paper-ink-soft)' }}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Paper>
        </div>
      </div>

      {move && <MoveModal store={store} preset={p} onClose={() => setMove(false)} />}
      {edit && <ProductModal store={store} edit={p} onClose={() => setEdit(false)} />}
    </div>
  );
}

function Row({ k, v, vColor }) {
  return (
    <div className="row between" style={{ fontSize: 14, fontFamily: 'var(--font-mono)' }}>
      <span style={{ color: 'var(--paper-ink-soft)' }}>{k}</span>
      <span style={{ fontWeight: 700, color: vColor || 'var(--paper-ink)' }}>{v}</span>
    </div>
  );
}
window.ItemDetail = ItemDetail;
