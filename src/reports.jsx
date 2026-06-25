/* ============================================================
   GARE CARD — Reports: Top 10, คงเหลือ, เคลื่อนไหว
   ============================================================ */
function Reports({ store, go, initialTab = 'top' }) {
  const G = window.GC;
  const s = store.state;
  const [tab, setTab] = React.useState(initialTab);

  const TABS = [['top', 'TOP 10 ขายดี'], ['stock', 'สินค้าคงเหลือ'], ['movement', 'รายงานเคลื่อนไหว']];

  return (
    <div className="rise">
      <PageHead kicker="วิเคราะห์ & รายงาน" title="RE" hl="PORTS" />
      <div className="row gap-s wrap" style={{ marginBottom: 22 }}>
        {TABS.map(([k, lab]) => (
          <button key={k} className="btn sm" onClick={() => setTab(k)}
            style={tab === k ? {} : { background: 'transparent', color: 'var(--lime)', border: '1.5px solid var(--lime)', boxShadow: 'none', clipPath: 'none' }}>{lab}</button>
        ))}
      </div>
      {tab === 'top' && <TopReport store={store} go={go} />}
      {tab === 'stock' && <StockReport store={store} go={go} />}
      {tab === 'movement' && <MovementReport store={store} go={go} />}
    </div>
  );
}

/* ---- TOP 10 ---- */
function TopReport({ store, go }) {
  const G = window.GC;
  const s = store.state;
  const [metric, setMetric] = React.useState('qty'); // qty | revenue | profit
  const top = G.topSellers(s, 10).sort((a, b) => b[metric] - a[metric]);
  const max = Math.max(1, ...top.map(r => r[metric]));
  const fmt = metric === 'qty' ? (v => `${v} ชิ้น`) : G.money;

  function exportCSV() {
    const rows = [['อันดับ', 'SKU', 'สินค้า', 'หมวดหมู่', 'จำนวนขาย', 'ยอดขาย', 'กำไร']];
    G.topSellers(s, 100).forEach((r, i) => rows.push([i + 1, r.product.sku, r.product.name, (G.CATS[r.product.cat] || {}).label, r.qty, r.revenue, r.profit]));
    G.downloadCSV(`GARECARD_ขายดี_${new Date().toISOString().slice(0,10)}.csv`, rows);
  }

  return (
    <div className="g-eq-2">
      <Paper variant="dark" tilt="tilt-1">
        <div className="row between wrap gap-s" style={{ marginBottom: 16 }}>
          <h3 className="display" style={{ fontSize: 20, color: 'var(--lime)' }}>จัดอันดับตาม</h3>
          <div className="row gap-s">
            {[['qty', 'จำนวน'], ['revenue', 'ยอดขาย'], ['profit', 'กำไร']].map(([k, lab]) => (
              <button key={k} className="chip" style={{ cursor: 'pointer', color: metric === k ? 'var(--ink)' : 'var(--lime)', background: metric === k ? 'var(--lime)' : 'transparent', borderColor: 'var(--lime)' }} onClick={() => setMetric(k)}>{lab}</button>
            ))}
          </div>
        </div>
        <div className="col" style={{ gap: 14 }}>
          {top.map((r, i) => (
            <div key={r.product.id} className="row gap-m" style={{ alignItems: 'center', cursor: 'pointer' }} onClick={() => go('item', r.product.id)}>
              <span className="display" style={{ fontSize: 30, width: 38, color: i < 3 ? 'var(--lime)' : 'rgba(239,233,216,0.3)', textAlign: 'center' }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row between">
                  <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--paper)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{r.product.name}</span>
                  <span className="num" style={{ fontSize: 14, color: 'var(--lime)', fontWeight: 700 }}>{fmt(r[metric])}</span>
                </div>
                <div className="bar-track" style={{ marginTop: 5, background: 'rgba(239,233,216,0.12)' }}>
                  <div className="bar-fill" style={{ width: `${(r[metric] / max) * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
          {top.length === 0 && <Empty>ยังไม่มีข้อมูลการขาย</Empty>}
        </div>
      </Paper>

      <Paper tilt="tilt-2">
        <div className="row between" style={{ marginBottom: 12 }}>
          <h3 className="display" style={{ fontSize: 20, color: 'var(--paper-ink)' }}>ตารางสรุป</h3>
          <button className="btn ghost sm" onClick={exportCSV} style={{ color: 'var(--paper-ink)', borderColor: 'rgba(22,23,15,0.3)' }}>⤓ CSV</button>
        </div>
        <table className="tbl">
          <thead><tr><th>#</th><th>สินค้า</th><th className="right">ขาย</th><th className="right">ยอดขาย</th><th className="right">กำไร</th></tr></thead>
          <tbody>
            {top.map((r, i) => (
              <tr key={r.product.id} style={{ cursor: 'pointer' }} onClick={() => go('item', r.product.id)}>
                <td style={{ fontWeight: 700 }}>{i + 1}</td>
                <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.product.name}</td>
                <td className="right">{r.qty}</td>
                <td className="right">{G.money(r.revenue)}</td>
                <td className="right pos" style={{ fontWeight: 700 }}>{G.money(r.profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Paper>
    </div>
  );
}

/* ---- คงเหลือ ---- */
function StockReport({ store, go }) {
  const G = window.GC;
  const s = store.state;
  const [sort, setSort] = React.useState('value');
  const sv = G.stockValue(s);
  const byCat = G.salesByCat(s);

  let list = s.products.map(p => ({ ...p, value: p.qty * p.cost, retail: p.qty * p.price }));
  const sorters = { value: (a, b) => b.value - a.value, qty: (a, b) => b.qty - a.qty, name: (a, b) => a.name.localeCompare(b.name) };
  list.sort(sorters[sort]);

  function exportCSV() {
    const rows = [['SKU', 'สินค้า', 'หมวดหมู่', 'คงเหลือ', 'จุดสั่งซื้อ', 'ทุน/ชิ้น', 'มูลค่าทุน', 'มูลค่าขาย', 'สถานะ']];
    list.forEach(p => rows.push([p.sku, p.name, (G.CATS[p.cat] || {}).label, p.qty, p.reorder, p.cost, p.value, p.retail, p.qty <= p.reorder ? 'ใกล้หมด' : 'ปกติ']));
    rows.push([]);
    rows.push(['', '', '', sv.units, '', '', sv.cost, sv.retail, '']);
    G.downloadCSV(`GARECARD_คงเหลือ_${new Date().toISOString().slice(0,10)}.csv`, rows);
  }

  return (
    <div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', marginBottom: 22 }}>
        <Stat tilt="tilt-1" kicker="จำนวนรวม" value={`${sv.units} ชิ้น`} sub={`${s.products.length} รายการ`} />
        <Stat tilt="tilt-2" kicker="มูลค่าทุน" value={G.moneyShort(sv.cost)} />
        <Stat tilt="tilt-3" kicker="มูลค่าขายรวม" value={G.moneyShort(sv.retail)} tone="pos" />
        <Stat tilt="tilt-1" kicker="กำไรในสต็อก" value={G.moneyShort(sv.margin)} tone="pos" sub="ถ้าขายหมด" />
      </div>

      <div className="g-fin-2">
        <Paper tilt="tilt-3">
          <div className="row between wrap gap-s" style={{ marginBottom: 12 }}>
            <h3 className="display" style={{ fontSize: 20, color: 'var(--paper-ink)' }}>สินค้าคงเหลือ</h3>
            <div className="row gap-s">
              <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: '5px 8px', fontSize: 14 }}>
                <option value="value">เรียงตามมูลค่า</option>
                <option value="qty">เรียงตามจำนวน</option>
                <option value="name">เรียงตามชื่อ</option>
              </select>
              <button className="btn ghost sm" onClick={exportCSV} style={{ color: 'var(--paper-ink)', borderColor: 'rgba(22,23,15,0.3)' }}>⤓ CSV</button>
            </div>
          </div>
          <table className="tbl">
            <thead><tr><th>สินค้า</th><th className="right">คงเหลือ</th><th className="right">ทุน/ชิ้น</th><th className="right">มูลค่า</th><th></th></tr></thead>
            <tbody>
              {list.map(p => {
                const low = p.qty <= p.reorder;
                return (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => go('item', p.id)}>
                    <td style={{ maxWidth: 200 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <span className="label" style={{ color: 'var(--paper-ink-soft)' }}>{(G.CATS[p.cat] || {}).short} · {p.sku}</span>
                    </td>
                    <td className="right" style={{ fontWeight: 700, color: low ? 'var(--red)' : 'var(--paper-ink)' }}>{p.qty}{low && ' ⚠'}</td>
                    <td className="right">{G.money(p.cost)}</td>
                    <td className="right" style={{ fontWeight: 700 }}>{G.money(p.value)}</td>
                    <td className="right">{low ? <span className="chip low">สั่งเพิ่ม</span> : <span className="chip" style={{ opacity: 0.5 }}>OK</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Paper>

        <Paper variant="lime" tilt="tilt-2">
          <h3 className="display" style={{ fontSize: 20, color: 'var(--ink)', marginBottom: 16 }}>ยอดขายตามหมวด</h3>
          {byCat.length === 0 ? <Empty>ยังไม่มีข้อมูล</Empty> :
            <Bars data={byCat} fmt={G.money} color="var(--ink)" />}
        </Paper>
      </div>
    </div>
  );
}

/* ---- เคลื่อนไหว ---- */
function MovementReport({ store, go }) {
  const G = window.GC;
  const s = store.state;
  const [type, setType] = React.useState('all');
  let feed = G.movementFeed(s);
  if (type !== 'all') feed = feed.filter(m => m.type === type);

  const totIn = G.movementFeed(s).filter(m => m.type === 'in').reduce((a, m) => a + m.qty, 0);
  const totOut = G.movementFeed(s).filter(m => m.type === 'out').reduce((a, m) => a + m.qty, 0);

  function exportCSV() {
    const rows = [['วันที่', 'SKU', 'สินค้า', 'ประเภท', 'จำนวน', 'ราคา/ชิ้น', 'รวม', 'หมายเหตุ']];
    [...feed].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(m => rows.push([m.date, m.product ? m.product.sku : '', m.product ? m.product.name : '', m.type === 'in' ? 'รับเข้า' : 'จ่ายออก', m.qty, m.unitPrice, m.qty * m.unitPrice, m.note]));
    G.downloadCSV(`GARECARD_เคลื่อนไหว_${new Date().toISOString().slice(0,10)}.csv`, rows);
  }

  return (
    <div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', marginBottom: 22 }}>
        <Stat tilt="tilt-1" kicker="รับเข้ารวม" value={`+${totIn} ชิ้น`} tone="pos" />
        <Stat tilt="tilt-2" kicker="จ่ายออกรวม" value={`−${totOut} ชิ้น`} tone="neg" />
        <Stat tilt="tilt-3" kicker="รายการทั้งหมด" value={G.movementFeed(s).length} />
      </div>

      <div className="row between wrap gap-s" style={{ marginBottom: 14 }}>
        <div className="row gap-s">
          {[['all', 'ทั้งหมด'], ['in', 'รับเข้า'], ['out', 'จ่ายออก']].map(([k, lab]) => (
            <button key={k} className="chip" style={{ cursor: 'pointer', padding: '6px 12px', color: type === k ? 'var(--ink)' : 'var(--paper)', background: type === k ? 'var(--lime)' : 'transparent', borderColor: type === k ? 'var(--lime)' : 'rgba(239,233,216,0.3)' }} onClick={() => setType(k)}>{lab}</button>
          ))}
        </div>
        <button className="btn ghost sm" onClick={exportCSV} style={{ color: 'var(--lime)' }}>⤓ Export CSV</button>
      </div>

      <Paper tilt="tilt-3">
        {feed.length === 0 ? <Empty>ไม่มีรายการ</Empty> : (
          <table className="tbl">
            <thead><tr><th>วันที่</th><th>สินค้า</th><th>ประเภท</th><th className="right">จำนวน</th><th className="right">ราคา/ชิ้น</th><th className="right">รวม</th><th>หมายเหตุ</th></tr></thead>
            <tbody>
              {feed.map(m => (
                <tr key={m.id} style={{ cursor: 'pointer' }} onClick={() => m.product && go('item', m.product.id)}>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>{G.fmtDate(m.date)}</td>
                  <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.product ? m.product.name : '— (ถูกลบ)'}</td>
                  <td><span className="chip" style={{ color: m.type === 'in' ? 'var(--lime-deep)' : 'var(--red)' }}>{m.type === 'in' ? 'รับเข้า' : 'จ่ายออก'}</span></td>
                  <td className="right" style={{ fontWeight: 700, color: m.type === 'in' ? 'var(--lime-deep)' : 'var(--red)' }}>{m.type === 'in' ? '+' : '−'}{m.qty}</td>
                  <td className="right">{G.money(m.unitPrice)}</td>
                  <td className="right">{G.money(m.qty * m.unitPrice)}</td>
                  <td className="muted" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Paper>
    </div>
  );
}

window.Reports = Reports;
