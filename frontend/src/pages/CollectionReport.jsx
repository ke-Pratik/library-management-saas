import { useState } from "react";
import { getMonthlyCollection, getCollectionByRange } from "../services/api";
import { toast } from "react-toastify";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function CollectionReport() {
  const now = new Date();
  const [reportType, setReportType] = useState("monthly");
  const [month,      setMonth]      = useState(now.getMonth() + 1);
  const [year,       setYear]       = useState(now.getFullYear());
  const [startDate,  setStartDate]  = useState("");
  const [endDate,    setEndDate]    = useState("");
  const [data,       setData]       = useState(null);
  const [prevData,   setPrevData]   = useState(null);
  const [loading,    setLoading]    = useState(false);

  const handleFetch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setData(null);
    setPrevData(null);
    try {
      if (reportType === "monthly") {
        const res = await getMonthlyCollection({ month, year });
        setData(res.data);
        const prevMonth = month === 1 ? 12 : Number(month) - 1;
        const prevYear  = month === 1 ? Number(year) - 1 : Number(year);
        try {
          const prevRes = await getMonthlyCollection({ month: prevMonth, year: prevYear });
          setPrevData(prevRes.data);
        } catch { /* no prev data — skip */ }
      } else {
        const res = await getCollectionByRange({ startDate, endDate });
        setData(res.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Error generating report");
    } finally {
      setLoading(false);
    }
  };

  // Higher = better (green ▲)
  const changeBadge = (curr, prev) => {
    if (prev == null || Number(prev) === 0) return null;
    const pct = (((curr - prev) / prev) * 100).toFixed(1);
    const up  = curr >= prev;
    return (
      <span className={`ms-2 small fw-bold ${up ? "text-success" : "text-danger"}`}>
        {up ? "▲" : "▼"} {Math.abs(pct)}%
      </span>
    );
  };

  // Lower = better (green ▼) — used for Outstanding
  const changeBadgeInverse = (curr, prev) => {
    if (prev == null || Number(prev) === 0) return null;
    const pct = (((curr - prev) / prev) * 100).toFixed(1);
    const up  = curr >= prev;
    return (
      <span className={`ms-2 small fw-bold ${up ? "text-danger" : "text-success"}`}>
        {up ? "▲" : "▼"} {Math.abs(pct)}%
      </span>
    );
  };

  const fmt = (n) => Number(n || 0).toLocaleString("en-IN");

  const exportCSV = () => {
    if (!data) return;
    const isMonthly = reportType === "monthly";
    const p = prevData;
    const rows = [
      ["Report Period", data.period],
      [],
      ["Metric", "Current Period", p ? "Previous Period" : ""],
      ...(isMonthly ? [
        ["--- BILLING STATUS ---", "", ""],
        ["Total Fee Expected",    fmt(data.totalFeeExpected),   p ? fmt(p.totalFeeExpected)   : ""],
        ["Fee Collected",         fmt(data.totalCollected),     p ? fmt(p.totalCollected)     : ""],
        ["Month Balance",         fmt(data.totalBalance),       p ? fmt(p.totalBalance)       : ""],
        ["Cash (Billing)",        fmt(data.cashCollected),      p ? fmt(p.cashCollected)      : ""],
        ["Online (Billing)",      fmt(data.onlineCollected),    p ? fmt(p.onlineCollected)    : ""],
        [],
        ["--- CASH FLOW ---", "", ""],
        ["Backlog Collected",     fmt(data.oldDuesRecovered),   p ? fmt(p.oldDuesRecovered)   : ""],
        ["Total Cash Received",   fmt(data.totalCashReceived),  p ? fmt(p.totalCashReceived)  : ""],
        [],
        ["--- OUTSTANDING DUES ---", "", ""],
        ["This Month Balance",    fmt(data.totalBalance),       p ? fmt(p.totalBalance)       : ""],
        ["Backlog Pending",       fmt(data.priorMonthDues),     p ? fmt(p.priorMonthDues)     : ""],
        ["Total Outstanding",     fmt(data.totalOutstandingDues), p ? fmt(p.totalOutstandingDues) : ""],
        [],
        ["--- STUDENT COUNTS ---", "", ""],
        ["Total Students",        data.totalStudents,   p?.totalStudents   ?? ""],
        ["Paid Count",            data.paidCount,       p?.paidCount       ?? ""],
        ["Partial Count",         data.partialCount,    p?.partialCount    ?? ""],
        ["Pending Count",         data.pendingCount,    p?.pendingCount    ?? ""],
      ] : [
        ["--- CASH FLOW ---", "", ""],
        ["Total Collected",       fmt(data.totalCollected),  "", ""],
        ["Cash Collected",        fmt(data.cashCollected),   "", ""],
        ["Online Collected",      fmt(data.onlineCollected), "", ""],
      ]),
    ];
    const csv  = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `collection-${data.period?.replace(/\s/g, "-") ?? "report"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isMonthly = reportType === "monthly";

  // Helper: table header columns
  const THead = ({ label }) => (
    <thead className="table-dark">
      <tr>
        <th>{label}</th>
        <th>{data?.period}</th>
        {prevData && <th>{prevData.period}</th>}
        {prevData && <th>Change</th>}
      </tr>
    </thead>
  );

  // Helper: standard table row
  const Row = ({ label, curr, prev, badge = changeBadge, className = "" }) => (
    <tr className={className}>
      <td>{label}</td>
      <td className="fw-bold">₹{fmt(curr)}</td>
      {prevData && <td>₹{fmt(prev)}</td>}
      {prevData && <td>{badge(Number(curr || 0), Number(prev || 0))}</td>}
    </tr>
  );

  return (
    <div>
      <h2 className="page-title">📊 Fee Collection Report</h2>

      {/* ── Form ── */}
      <div className="form-section col-lg-8 mb-4">
        <div className="mb-3">
          <label className="form-label fw-bold">Report Type</label>
          <div className="d-flex gap-3">
            <div className="form-check">
              <input className="form-check-input" type="radio"
                checked={reportType === "monthly"}
                onChange={() => { setReportType("monthly"); setData(null); setPrevData(null); }} />
              <label className="form-check-label">Monthly</label>
            </div>
            <div className="form-check">
              <input className="form-check-input" type="radio"
                checked={reportType === "range"}
                onChange={() => { setReportType("range"); setData(null); setPrevData(null); }} />
              <label className="form-check-label">Custom Date Range</label>
            </div>
          </div>
        </div>

        <form onSubmit={handleFetch}>
          {isMonthly ? (
            <div className="d-flex gap-3 align-items-end">
              <div>
                <label className="form-label fw-bold">Month</label>
                <select className="form-select" value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}>
                  {MONTH_NAMES.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label fw-bold">Year</label>
                <input type="number" className="form-control" value={year}
                  onChange={(e) => setYear(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "..." : "📊 Generate"}
              </button>
            </div>
          ) : (
            <div className="d-flex gap-3 align-items-end">
              <div>
                <label className="form-label fw-bold">From</label>
                <input type="date" className="form-control" value={startDate}
                  onChange={(e) => setStartDate(e.target.value)} required />
              </div>
              <div>
                <label className="form-label fw-bold">To</label>
                <input type="date" className="form-control" value={endDate}
                  onChange={(e) => setEndDate(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "..." : "📊 Generate"}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* ── Results ── */}
      {data && (
        <>
          {/* Period header + Export */}
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <h5 className="fw-bold mb-0">
              📊 {data.period}
              {prevData && (
                <small className="text-muted ms-2 fw-normal fs-6">
                  vs {prevData.period}
                </small>
              )}
            </h5>
            <button className="btn btn-sm btn-outline-success" onClick={exportCSV}>
              📥 Export CSV
            </button>
          </div>

          {/* ═══ MONTHLY MODE ═══ */}
          {isMonthly && (
            <>
              {/* Student Summary Cards */}
              <div className="row g-3 mb-4">
                {[
                  { label: "Total Students", value: data.totalStudents, prev: prevData?.totalStudents, color: "" },
                  { label: "✅ Paid",        value: data.paidCount,     prev: prevData?.paidCount,     color: "border-success" },
                  { label: "🔶 Partial",     value: data.partialCount,  prev: prevData?.partialCount,  color: "border-warning" },
                  { label: "⏳ Pending",     value: data.pendingCount,  prev: prevData?.pendingCount,  color: "border-danger"  },
                ].map(({ label, value, prev, color }) => (
                  <div className="col-md-3" key={label}>
                    <div className={`card text-center p-3 ${color}`}>
                      <h4>{value}</h4>
                      {prev != null && (
                        <div className="small text-muted">
                          prev: {prev}
                          {changeBadge(value, prev)}
                        </div>
                      )}
                      <small>{label}</small>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Section 1: Billing Status ── */}
              <div className="card mb-3 border-0 shadow-sm">
                <div className="card-body p-0">
                  <table className="table table-bordered mb-0">
                    <THead label="📋 Billing Status" />
                    <tbody>
                      <Row label="Total Fee Expected"
                           curr={data.totalFeeExpected} prev={prevData?.totalFeeExpected} />
                      <Row label="Fee Collected"
                           curr={data.totalCollected}   prev={prevData?.totalCollected}
                           className="table-success" />
                      <Row label="Month Balance"
                           curr={data.totalBalance}     prev={prevData?.totalBalance}
                           badge={changeBadgeInverse}   className="table-danger" />
                      <Row label="💵 Cash (Billing)"
                           curr={data.cashCollected}    prev={prevData?.cashCollected} />
                      <Row label="💳 Online (Billing)"
                           curr={data.onlineCollected}  prev={prevData?.onlineCollected} />
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Section 2: Cash Flow ── */}
              <div className="card mb-3 border-0 shadow-sm">
                <div className="card-body p-0">
                  <table className="table table-bordered mb-0">
                    <THead label="💵 Cash Flow — Physically Received" />
                    <tbody>
                      <tr className="text-muted">
                        <td>Fee Collected (this month's billing)</td>
                        <td>₹{fmt(data.totalCollected)}</td>
                        {prevData && <td>₹{fmt(prevData.totalCollected)}</td>}
                        {prevData && <td />}
                      </tr>
                      <tr className="table-warning">
                        <td>🟠 Backlog Collected <small className="text-muted">(prev month dues paid this month)</small></td>
                        <td className="fw-bold">₹{fmt(data.oldDuesRecovered)}</td>
                        {prevData && <td>₹{fmt(prevData.oldDuesRecovered)}</td>}
                        {prevData && <td>{changeBadge(Number(data.oldDuesRecovered || 0), Number(prevData.oldDuesRecovered || 0))}</td>}
                      </tr>
                      <tr className="table-success">
                        <td className="fw-bold">✅ Total Cash Received <small className="text-muted">(matches cash drawer)</small></td>
                        <td className="fw-bold fs-5">₹{fmt(data.totalCashReceived)}</td>
                        {prevData && <td className="fw-bold">₹{fmt(prevData.totalCashReceived)}</td>}
                        {prevData && <td>{changeBadge(Number(data.totalCashReceived || 0), Number(prevData.totalCashReceived || 0))}</td>}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Section 3: Outstanding Dues ── */}
              <div className="card mb-3 border-0 shadow-sm">
                <div className="card-body p-0">
                  <table className="table table-bordered mb-0">
                    <THead label="🔴 Outstanding Dues (Active Students — All Months)" />
                    <tbody>
                      <tr>
                        <td>This Month Balance</td>
                        <td className="fw-bold">₹{fmt(data.totalBalance)}</td>
                        {prevData && <td>₹{fmt(prevData.totalBalance)}</td>}
                        {prevData && <td>{changeBadgeInverse(Number(data.totalBalance || 0), Number(prevData.totalBalance || 0))}</td>}
                      </tr>
                      <tr className="table-warning">
                        <td>🟠 Backlog Pending <small className="text-muted">(unpaid from previous months)</small></td>
                        <td className="fw-bold">₹{fmt(data.priorMonthDues)}</td>
                        {prevData && <td>₹{fmt(prevData.priorMonthDues)}</td>}
                        {prevData && <td>{changeBadgeInverse(Number(data.priorMonthDues || 0), Number(prevData.priorMonthDues || 0))}</td>}
                      </tr>
                      <tr className="table-danger">
                        <td className="fw-bold">🔴 Total Outstanding <small className="text-muted">(all months combined)</small></td>
                        <td className="fw-bold fs-5">₹{fmt(data.totalOutstandingDues)}</td>
                        {prevData && <td className="fw-bold">₹{fmt(prevData.totalOutstandingDues)}</td>}
                        {prevData && <td>{changeBadgeInverse(Number(data.totalOutstandingDues || 0), Number(prevData.totalOutstandingDues || 0))}</td>}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {prevData && (
                <small className="text-muted">
                  ▲▼ Billing/Cash: higher is better &nbsp;|&nbsp;
                  ▲▼ Outstanding: lower is better
                </small>
              )}
            </>
          )}

          {/* ═══ DATE RANGE MODE ═══ */}
          {!isMonthly && (
            <>
              <div className="alert alert-info py-2 mb-3">
                <small>
                  📌 <strong>Date Range mode</strong> shows payments physically recorded in this window.
                  Student counts, Billing Status and Outstanding are only available in Monthly mode.
                </small>
              </div>
              <div className="card border-0 shadow-sm">
                <div className="card-body p-0">
                  <table className="table table-bordered mb-0">
                    <thead className="table-dark">
                      <tr>
                        <th>Metric</th>
                        <th>{data.period}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="table-success">
                        <td className="fw-bold">✅ Total Collected</td>
                        <td className="fw-bold fs-5">₹{fmt(data.totalCollected)}</td>
                      </tr>
                      <tr>
                        <td>💵 Cash Collected</td>
                        <td className="fw-bold">₹{fmt(data.cashCollected)}</td>
                      </tr>
                      <tr>
                        <td>💳 Online Collected</td>
                        <td className="fw-bold">₹{fmt(data.onlineCollected)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default CollectionReport;
