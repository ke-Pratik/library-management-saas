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
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState(null);
  const [prevData, setPrevData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFetch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setData(null);
    setPrevData(null);
    try {
      if (reportType === "monthly") {
        const res = await getMonthlyCollection({ month, year });
        setData(res.data);

        // Auto-fetch previous month for comparison
        const prevMonth = month === 1 ? 12 : Number(month) - 1;
        const prevYear  = month === 1 ? Number(year) - 1 : Number(year);
        try {
          const prevRes = await getMonthlyCollection({ month: prevMonth, year: prevYear });
          setPrevData(prevRes.data);
        } catch {
          // No previous month data — silently skip
        }
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

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ["Report Period", data.period],
      [],
      ["Metric", "Current Month", prevData ? "Previous Month" : ""],
      ["Total Students",    data.totalStudents,    prevData?.totalStudents    ?? ""],
      ["Paid Count",        data.paidCount,        prevData?.paidCount        ?? ""],
      ["Partial Count",     data.partialCount,     prevData?.partialCount     ?? ""],
      ["Pending Count",     data.pendingCount,     prevData?.pendingCount     ?? ""],
      ["Total Fee Expected",data.totalFeeExpected, prevData?.totalFeeExpected ?? ""],
      ["Total Collected",   data.totalCollected,   prevData?.totalCollected   ?? ""],
      ["Total Balance",     data.totalBalance,     prevData?.totalBalance     ?? ""],
      ["Cash Collected",    data.cashCollected,    prevData?.cashCollected    ?? ""],
      ["Online Collected",  data.onlineCollected,  prevData?.onlineCollected  ?? ""],
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `collection-${data.period?.replace(/\s/g, "-") ?? "report"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Show ▲/▼ % change vs previous month
  const changeBadge = (curr, prev) => {
    if (prev == null || prev === 0) return null;
    const pct = (((curr - prev) / prev) * 100).toFixed(1);
    const up = curr >= prev;
    return (
      <span className={`ms-2 small fw-bold ${up ? "text-success" : "text-danger"}`}>
        {up ? "▲" : "▼"} {Math.abs(pct)}%
      </span>
    );
  };

  return (
    <div>
      <h2 className="page-title">📊 Fee Collection Report</h2>

      <div className="form-section col-lg-8 mb-4">
        <div className="mb-3">
          <label className="form-label fw-bold">Report Type</label>
          <div className="d-flex gap-3">
            <div className="form-check">
              <input className="form-check-input" type="radio"
                checked={reportType === "monthly"}
                onChange={() => setReportType("monthly")} />
              <label className="form-check-label">Monthly</label>
            </div>
            <div className="form-check">
              <input className="form-check-input" type="radio"
                checked={reportType === "range"}
                onChange={() => setReportType("range")} />
              <label className="form-check-label">Custom Date Range</label>
            </div>
          </div>
        </div>

        <form onSubmit={handleFetch}>
          {reportType === "monthly" ? (
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

      {data && (
        <div className="result-card">
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
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

          {/* Summary cards */}
          <div className="row g-3 mb-4">
            {[
              { label: "Total Students", value: data.totalStudents,  prev: prevData?.totalStudents,  color: "" },
              { label: "✅ Paid",        value: data.paidCount,      prev: prevData?.paidCount,      color: "border-success" },
              { label: "🔶 Partial",     value: data.partialCount,   prev: prevData?.partialCount,   color: "border-warning" },
              { label: "⏳ Pending",     value: data.pendingCount,   prev: prevData?.pendingCount,   color: "border-danger" },
            ].map(({ label, value, prev, color }) => (
              <div className="col-md-3" key={label}>
                <div className={`card text-center p-3 ${color}`}>
                  <h4>{value}</h4>
                  {prev != null && (
                    <div className="small text-muted">
                      prev: {prev} {changeBadge(value, prev)}
                    </div>
                  )}
                  <small>{label}</small>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed table with comparison */}
          <table className="table table-bordered">
            <thead className="table-dark">
              <tr>
                <th>Metric</th>
                <th>{data.period}</th>
                {prevData && <th>{prevData.period}</th>}
                {prevData && <th>Change</th>}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Total Fee Expected</td>
                <td className="fw-bold">₹{data.totalFeeExpected}</td>
                {prevData && <td>₹{prevData.totalFeeExpected}</td>}
                {prevData && <td>{changeBadge(data.totalFeeExpected, prevData.totalFeeExpected)}</td>}
              </tr>
              <tr className="table-success">
                <td>Total Collected</td>
                <td className="fw-bold fs-5">₹{data.totalCollected}</td>
                {prevData && <td>₹{prevData.totalCollected}</td>}
                {prevData && <td>{changeBadge(data.totalCollected, prevData.totalCollected)}</td>}
              </tr>
              <tr className="table-danger">
                <td>Total Balance</td>
                <td className="fw-bold">₹{data.totalBalance}</td>
                {prevData && <td>₹{prevData.totalBalance}</td>}
                {prevData && <td>{changeBadge(data.totalBalance, prevData.totalBalance)}</td>}
              </tr>
              <tr>
                <td>💵 Cash Collected</td>
                <td className="fw-bold">₹{data.cashCollected}</td>
                {prevData && <td>₹{prevData.cashCollected}</td>}
                {prevData && <td>{changeBadge(data.cashCollected, prevData.cashCollected)}</td>}
              </tr>
              <tr>
                <td>💳 Online Collected</td>
                <td className="fw-bold">₹{data.onlineCollected}</td>
                {prevData && <td>₹{prevData.onlineCollected}</td>}
                {prevData && <td>{changeBadge(data.onlineCollected, prevData.onlineCollected)}</td>}
              </tr>
            </tbody>
          </table>
          {prevData && (
            <small className="text-muted">▲ higher than previous month | ▼ lower than previous month</small>
          )}
        </div>
      )}
    </div>
  );
}

export default CollectionReport;
