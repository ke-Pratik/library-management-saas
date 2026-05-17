import { useState, useMemo } from "react";
import { getAllFeeStatus, generateAllFees } from "../services/api"; // ← ENHANCEMENT #2: import generateAllFees
import { toast } from "react-toastify";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function AllFeeStatus() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");

  // ── ENHANCEMENT #2: Generate All state ───────────────────────────────
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState(null);
  // ── END ENHANCEMENT #2 ───────────────────────────────────────────────

  const handleFetch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setData(null);
    setStatusFilter("ALL");
    setGenResult(null); // clear previous generate result on new fetch
    try {
      const res = await getAllFeeStatus({ month, year });
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  // ── ENHANCEMENT #2: Generate All handler ─────────────────────────────
  // Calls POST /fees/generate-all?month=X&year=Y
  // After success, auto-refreshes the fee status table for the same month/year
  const handleGenerateAll = async () => {
    setGenLoading(true);
    setGenResult(null);
    try {
      const res = await generateAllFees({ month, year });
      setGenResult(res.data);
      toast.success(
        `Generated: ${res.data.generated} | Skipped: ${res.data.skipped} | No Config: ${res.data.noConfig}`
      );
      // Auto-refresh the table so admin sees newly created records immediately
      if (res.data.generated > 0) {
        const refreshed = await getAllFeeStatus({ month, year });
        setData(refreshed.data);
        setStatusFilter("ALL");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Fee generation failed");
    } finally {
      setGenLoading(false);
    }
  };
  // ── END ENHANCEMENT #2 ───────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!data?.students) return [];
    if (statusFilter === "ALL") return data.students;
    return data.students.filter((s) => s.paymentStatus === statusFilter);
  }, [data, statusFilter]);

  const exportCSV = () => {
    if (!filtered.length) {
      toast.error("No data to export");
      return;
    }
    const headers = [
      "S.No","Reg No","Name","Time Slot",
      "Total Fee","Paid","Balance","Status","Mode","Receipt No"
    ];
    const rows = filtered.map((s, i) => [
      i + 1, s.regNo, s.studentName, s.timeSlot,
      s.finalFee, s.paidAmount, s.balanceAmount,
      s.paymentStatus, s.paymentMode || "-", s.receiptNumber || "-",
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fee-status-${MONTH_NAMES[month - 1]}-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusBadge = (s) => {
    if (s === "PAID")    return <span className="badge badge-paid">✅ PAID</span>;
    if (s === "PARTIAL") return <span className="badge badge-partial">🔶 PARTIAL</span>;
    return <span className="badge badge-pending">⏳ PENDING</span>;
  };

  const countOf = (status) =>
    data?.students?.filter((s) => s.paymentStatus === status).length ?? 0;

  return (
    <div>
      <h2 className="page-title">📋 All Students Fee Status</h2>

      {/* Month/Year selector + Fetch + Generate All */}
      <div className="form-section col-lg-8 mb-4">
        <form onSubmit={handleFetch} className="d-flex gap-3 align-items-end flex-wrap">
          <div>
            <label className="form-label fw-bold">Month</label>
            <select
              className="form-select"
              value={month}
              onChange={(e) => { setMonth(Number(e.target.value)); setGenResult(null); }}
            >
              {MONTH_NAMES.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label fw-bold">Year</label>
            <input
              type="number"
              className="form-control"
              style={{ width: "100px" }}
              value={year}
              onChange={(e) => { setYear(e.target.value); setGenResult(null); }}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Loading..." : "🔍 Fetch"}
          </button>

          {/* ── ENHANCEMENT #2: Generate All Fees button ─────────────────
              Admin clicks this at start of month to create PENDING records
              for all active students who have a config but no record yet.
              Idempotent — existing records are never touched. */}
          <button
            type="button"
            className="btn btn-warning"
            onClick={handleGenerateAll}
            disabled={genLoading}
            title="Creates fee records for all active students who don't have one yet for this month"
          >
            {genLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Generating...
              </>
            ) : (
              "⚡ Generate All Fees"
            )}
          </button>
          {/* ── END ENHANCEMENT #2 button ─────────────────────────────── */}
        </form>
      </div>

      {/* ── ENHANCEMENT #2: Generation result summary ────────────────────── */}
      {genResult && (
        <div className="alert alert-warning col-lg-8 mb-4">
          <h6 className="fw-bold mb-2">
            ⚡ Fee Generation Result — {MONTH_NAMES[genResult.month - 1]} {genResult.year}
          </h6>
          <div className="d-flex gap-4 flex-wrap mb-2">
            <span>
              <span className="fw-bold text-dark">Total Active Students:</span>{" "}
              {genResult.totalActiveStudents}
            </span>
            <span>
              <span className="fw-bold text-success">✅ Generated:</span>{" "}
              {genResult.generated}
            </span>
            <span>
              <span className="fw-bold text-secondary">⏭ Skipped (already existed):</span>{" "}
              {genResult.skipped}
            </span>
            <span>
              <span className="fw-bold text-danger">⚠️ No Config:</span>{" "}
              {genResult.noConfig}
            </span>
          </div>
          {/* Show regNos with no config so admin can manually lock their fee */}
          {genResult.noConfig > 0 && (
            <div className="mt-1">
              <small className="text-danger fw-bold">
                These students have no fee config — lock their fee manually from the Fee Calculate page:
              </small>
              <div className="mt-1 d-flex gap-2 flex-wrap">
                {genResult.noConfigRegNos.map((rn) => (
                  <span key={rn} className="badge bg-danger">Reg #{rn}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {/* ── END ENHANCEMENT #2 result summary ───────────────────────────── */}

      {data && (
        <div>
          {/* Summary badges */}
          <div className="d-flex gap-2 mb-3 flex-wrap">
            <span className="badge badge-paid px-3 py-2">
              ✅ Paid: {data.paidCount}
            </span>
            <span className="badge badge-partial px-3 py-2">
              🔶 Partial: {data.partialCount}
            </span>
            <span className="badge badge-pending px-3 py-2">
              ⏳ Pending: {data.pendingCount}
            </span>
            <span className="badge bg-dark px-3 py-2">
              Expected: ₹{data.totalFeeExpected} | Collected: ₹{data.totalCollected}
            </span>
          </div>

          {/* Filter + Export */}
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <div className="d-flex gap-2 flex-wrap">
              {[
                { key: "ALL",     label: `All (${data.students.length})` },
                { key: "PAID",    label: `✅ Paid (${countOf("PAID")})` },
                { key: "PARTIAL", label: `🔶 Partial (${countOf("PARTIAL")})` },
                { key: "PENDING", label: `⏳ Pending (${countOf("PENDING")})` },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  className={`btn btn-sm ${statusFilter === key ? "btn-dark" : "btn-outline-secondary"}`}
                  onClick={() => setStatusFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button className="btn btn-sm btn-outline-success" onClick={exportCSV}>
              📥 Export CSV
            </button>
          </div>

          {filtered.length === 0 ? (
            <div className="alert alert-info">
              No students with <strong>{statusFilter}</strong> status for{" "}
              {MONTH_NAMES[month - 1]} {year}.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-custom table-hover">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>RegNo</th>
                    <th>Name</th>
                    <th>Slot</th>
                    <th>Fee</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Mode</th>
                    <th>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td className="fw-bold">{s.regNo}</td>
                      <td>{s.studentName}</td>
                      <td>{s.timeSlot}</td>
                      <td>₹{s.finalFee}</td>
                      <td>₹{s.paidAmount}</td>
                      <td className={s.balanceAmount > 0 ? "fw-bold text-danger" : "text-success"}>
                        ₹{s.balanceAmount}
                      </td>
                      <td>{statusBadge(s.paymentStatus)}</td>
                      <td>{s.paymentMode || "—"}</td>
                      <td className="text-muted small">{s.receiptNumber || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <small className="text-muted">
            ⚠️ Students with no fee record for this month are not shown here.
            Use <strong>⚡ Generate All Fees</strong> button above to create records for all active students,
            or lock individually from the <strong>Fee Calculate</strong> page.
          </small>
        </div>
      )}
    </div>
  );
}

export default AllFeeStatus;
