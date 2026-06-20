import { useState, useMemo, useEffect } from "react";
import {
  getAllFeeStatus,
  generateAllFees,
  getStudentsWithNoConfig,
} from "../services/api";
import { toast } from "react-toastify";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const PAGE_SIZE = 20;

function AllFeeStatus() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult]   = useState(null);

  // No-config check state
  const [noConfigData, setNoConfigData]       = useState(null);
  const [noConfigLoading, setNoConfigLoading] = useState(false);

  // ── NEW: Section collapse + Pagination + Create Bills confirmation ──
  const [setupExpanded, setSetupExpanded] = useState(true);
  const [page, setPage] = useState(0);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);

  // ── Fetch records ──
  const handleFetch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setData(null);
    setStatusFilter("ALL");
    setGenResult(null);
    setNoConfigData(null);
    setPage(0);
    try {
      const res = await getAllFeeStatus({ month, year });
      setData(res.data);
      // Smart auto-collapse: once admin sees data, get the tasks panel out of the way
      setSetupExpanded(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Create Bills (with confirmation) ──
  const openCreateConfirm = () => {
    setGenResult(null);
    setShowCreateConfirm(true);
  };
  const closeCreateConfirm = () => {
    if (genLoading) return;
    setShowCreateConfirm(false);
  };
  const confirmCreateBills = async () => {
    setGenLoading(true);
    setGenResult(null);
    try {
      const res = await generateAllFees({ month, year });
      setGenResult(res.data);
      toast.success(
        `Created: ${res.data.generated} | Skipped: ${res.data.skipped} | Missing Setup: ${res.data.noConfig}`,
      );
      if (res.data.generated > 0) {
        const refreshed = await getAllFeeStatus({ month, year });
        setData(refreshed.data);
        setStatusFilter("ALL");
        setPage(0);
      }
      setShowCreateConfirm(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Bill creation failed");
    } finally {
      setGenLoading(false);
    }
  };

  // ── Step 1: Find students without fee setup ──
  const handleCheckNoConfig = async () => {
    setNoConfigLoading(true);
    setNoConfigData(null);
    try {
      const res = await getStudentsWithNoConfig();
      setNoConfigData(res.data);
      if (res.data.count === 0)
        toast.success("All students have fee setup completed! ✅");
      else toast.warn(`${res.data.count} student(s) missing fee setup`);
    } catch (err) {
      toast.error("Failed to fetch students without setup");
    } finally {
      setNoConfigLoading(false);
    }
  };

  // ── Filtering ──
  const filtered = useMemo(() => {
    if (!data?.students) return [];
    if (statusFilter === "ALL") return data.students;
    return data.students.filter((s) => s.paymentStatus === statusFilter);
  }, [data, statusFilter]);

  // Reset to page 0 when filter changes
  useEffect(() => { setPage(0); }, [statusFilter]);

  // ── Pagination ──
  const totalPages   = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated    = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const rangeStart   = filtered.length === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd     = Math.min((page + 1) * PAGE_SIZE, filtered.length);

  // ── CSV Export ──
  const exportCSV = () => {
    if (!filtered.length) { toast.error("No data to export"); return; }
    const headers = ["S.No","Reg No","Name","Time Slot","Total Fee","Paid","Balance","Status","Mode","Receipt No"];
    const rows = filtered.map((s, i) => [
      i + 1, s.regNo, s.studentName, s.timeSlot || "-",
      s.finalFee ?? "-", s.paidAmount ?? "-", s.balanceAmount ?? "-",
      s.paymentStatus, s.paymentMode || "-", s.receiptNumber || "-",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `fee-status-${MONTH_NAMES[month - 1]}-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusBadge = (s) => {
    if (s === "PAID")      return <span className="badge badge-paid">✅ PAID</span>;
    if (s === "PARTIAL")   return <span className="badge badge-partial">🔶 PARTIAL</span>;
    if (s === "NO_RECORD") return <span className="badge bg-danger">🚫 NO RECORD</span>;
    return <span className="badge badge-pending">⏳ PENDING</span>;
  };

  const countOf = (status) =>
    data?.students?.filter((s) => s.paymentStatus === status).length ?? 0;

  // ── Pre-computed counts for the confirm modal ──
  const newBillsCount   = data ? countOf("NO_RECORD") : 0;
  const existingCount   = data ? (data.students.length - newBillsCount) : 0;

  return (
    <div>
      <h2 className="page-title">📋 All Students Fee Status</h2>

      {/* ════════════════════════════════════════════
          SECTION A — View Fee Status
          ════════════════════════════════════════════ */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <h6 className="fw-bold mb-3">🔍 View Fee Status</h6>
          <form onSubmit={handleFetch} className="d-flex gap-3 align-items-end flex-wrap">
            <div>
              <label className="form-label fw-bold small mb-1">Month</label>
              <select
                className="form-select"
                value={month}
                onChange={(e) => { setMonth(Number(e.target.value)); setGenResult(null); setNoConfigData(null); }}
              >
                {MONTH_NAMES.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label fw-bold small mb-1">Year</label>
              <input
                type="number" className="form-control" style={{ width: "100px" }}
                value={year}
                onChange={(e) => { setYear(e.target.value); setGenResult(null); setNoConfigData(null); }}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Loading..." : "🔍 Fetch Records"}
            </button>
          </form>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          SECTION B — Monthly Setup Tasks (auto-collapse)
          ════════════════════════════════════════════ */}
      <div className="card border-0 shadow-sm mb-4">
        <div
          className="card-header bg-light d-flex justify-content-between align-items-center"
          style={{ cursor: "pointer" }}
          onClick={() => setSetupExpanded(!setupExpanded)}
        >
          <h6 className="fw-bold mb-0">📅 Monthly Setup Tasks</h6>
          <button type="button" className="btn btn-sm btn-outline-secondary">
            {setupExpanded ? "Hide ▲" : "Show ▼"}
          </button>
        </div>

        {setupExpanded && (
          <div className="card-body">
            <p className="text-muted small mb-3">
              Run these at the start of each month to keep billing organized.
            </p>

            <div className="row g-3">
              {/* Step 1 — Find Students Without Fee Setup */}
              <div className="col-md-6">
                <div className="border rounded p-3 h-100">
                  <div className="fw-bold mb-1">
                    <span className="badge bg-secondary me-2">Step 1</span>
                    Find Students Without Fee Setup
                  </div>
                  <p className="small text-muted mb-2">
                    Check which active students haven't had their fee locked yet.
                    These students <strong>can't be billed automatically.</strong>
                  </p>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={handleCheckNoConfig}
                    disabled={noConfigLoading}
                  >
                    {noConfigLoading ? "Checking..." : "🔍 Run Check"}
                  </button>
                </div>
              </div>

              {/* Step 2 — Create This Month's Bills */}
              <div className="col-md-6">
                <div className="border rounded p-3 h-100">
                  <div className="fw-bold mb-1">
                    <span className="badge bg-secondary me-2">Step 2</span>
                    Create This Month's Bills
                  </div>
                  <p className="small text-muted mb-2">
                    Generate bills for all active students for <strong>{MONTH_NAMES[month - 1]} {year}</strong>.{" "}
                    Safe to re-run — existing bills won't be duplicated.
                  </p>
                  <button
                    type="button"
                    className="btn btn-warning btn-sm"
                    onClick={openCreateConfirm}
                    disabled={genLoading}
                  >
                    {genLoading
                      ? <><span className="spinner-border spinner-border-sm me-2" />Creating...</>
                      : `📅 Create Bills for ${MONTH_NAMES[month - 1]} ${year}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Bill Creation result ── */}
      {genResult && (
        <div className="alert alert-warning mb-4">
          <h6 className="fw-bold mb-2">
            📅 Bill Creation Result — {MONTH_NAMES[genResult.month - 1]} {genResult.year}
          </h6>
          <div className="d-flex gap-4 flex-wrap mb-2">
            <span><strong>Total Active:</strong> {genResult.totalActiveStudents}</span>
            <span><strong className="text-success">✅ Created:</strong> {genResult.generated}</span>
            <span><strong className="text-secondary">⏭ Already had bill:</strong> {genResult.skipped}</span>
            <span><strong className="text-danger">⚠️ Missing setup:</strong> {genResult.noConfig}</span>
          </div>
          {genResult.noConfig > 0 && (
            <div>
              <small className="text-danger fw-bold">
                Lock fee for these students from the Fee Calculate page:
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

      {/* ── No-config result ── */}
      {noConfigData && (
        <div className={`alert mb-4 ${noConfigData.count > 0 ? "alert-danger" : "alert-success"}`}>
          <h6 className="fw-bold mb-2">⚠️ Students Without Fee Setup</h6>
          <p className="mb-2">{noConfigData.message}</p>
          {noConfigData.count > 0 && (
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead className="table-dark">
                  <tr>
                    <th>Reg No</th><th>Name</th><th>Mobile</th>
                    <th>Time Slot</th><th>Admission Date</th>
                  </tr>
                </thead>
                <tbody>
                  {noConfigData.students.map((s) => (
                    <tr key={s.regNo}>
                      <td className="fw-bold">{s.regNo}</td>
                      <td>{s.name}</td>
                      <td>{s.mobile}</td>
                      <td>{s.timeSlot || "—"}</td>
                      <td>{s.dateOfAdmission || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button className="btn btn-sm btn-outline-secondary mt-2" onClick={() => setNoConfigData(null)}>
            ✕ Dismiss
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════
          DATA TABLE
          ════════════════════════════════════════════ */}
      {data && (
        <div>
          {/* Summary badges */}
          <div className="d-flex gap-2 mb-3 flex-wrap align-items-center">
            <span className="badge badge-paid px-3 py-2">✅ Paid: {data.paidCount}</span>
            <span className="badge badge-partial px-3 py-2">🔶 Partial: {data.partialCount}</span>
            <span className="badge badge-pending px-3 py-2">⏳ Pending: {data.pendingCount}</span>
            <span className="badge bg-danger px-3 py-2">🚫 No Record: {data.noRecordCount}</span>
            <span className="badge bg-dark px-3 py-2">
              Expected: ₹{data.totalFeeExpected} | Collected: ₹{data.totalCollected}
            </span>
          </div>

          {/* Filter + Export */}
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <div className="d-flex gap-2 flex-wrap">
              {[
                { key: "ALL", label: `All (${data.students.length})` },
                { key: "PAID", label: `✅ Paid (${countOf("PAID")})` },
                { key: "PARTIAL", label: `🔶 Partial (${countOf("PARTIAL")})` },
                { key: "PENDING", label: `⏳ Pending (${countOf("PENDING")})` },
                { key: "NO_RECORD", label: `🚫 No Record (${countOf("NO_RECORD")})` },
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
              No students with <strong>{statusFilter}</strong> status for {MONTH_NAMES[month - 1]} {year}.
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-custom table-hover">
                  <thead>
                    <tr>
                      <th>#</th><th>RegNo</th><th>Name</th><th>Slot</th>
                      <th>Fee</th><th>Paid</th><th>Balance</th>
                      <th>Status</th><th>Mode</th><th>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((s, i) => (
                      <tr key={s.regNo} className={s.paymentStatus === "NO_RECORD" ? "table-danger" : ""}>
                        <td>{page * PAGE_SIZE + i + 1}</td>
                        <td className="fw-bold">{s.regNo}</td>
                        <td>{s.studentName}</td>
                        <td>{s.timeSlot || "—"}</td>
                        <td>{s.finalFee != null ? `₹${s.finalFee}` : "—"}</td>
                        <td>{s.paidAmount != null ? `₹${s.paidAmount}` : "—"}</td>
                        <td className={
                          s.paymentStatus === "NO_RECORD" ? "" :
                          s.balanceAmount > 0 ? "fw-bold text-danger" : "text-success"
                        }>
                          {s.balanceAmount != null ? `₹${s.balanceAmount}` : "—"}
                        </td>
                        <td>{statusBadge(s.paymentStatus)}</td>
                        <td>{s.paymentMode || "—"}</td>
                        <td className="text-muted small">{s.receiptNumber || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Pagination ── */}
              {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
                  <span className="text-muted small">
                    Showing {rangeStart}–{rangeEnd} of {filtered.length}
                  </span>
                  <div className="d-flex align-items-center gap-2">
                    <button className="btn btn-sm btn-outline-secondary" disabled={page === 0} onClick={() => setPage(0)}>« First</button>
                    <button className="btn btn-sm btn-outline-primary"   disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
                    <span className="badge bg-secondary px-3 py-2">{page + 1} / {totalPages}</span>
                    <button className="btn btn-sm btn-outline-primary"   disabled={page === totalPages - 1} onClick={() => setPage(p => p + 1)}>Next ›</button>
                    <button className="btn btn-sm btn-outline-secondary" disabled={page === totalPages - 1} onClick={() => setPage(totalPages - 1)}>Last »</button>
                  </div>
                </div>
              )}
            </>
          )}

          {data.noRecordCount > 0 && (
            <div className="alert alert-warning mt-3 py-2">
              <small>
                ⚠️ <strong>{data.noRecordCount} student(s)</strong> have no bill for {MONTH_NAMES[month - 1]} {year}.{" "}
                Expand <strong>Monthly Setup Tasks</strong> and run <strong>Step 2: Create Bills</strong>.
              </small>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════
          CONFIRMATION MODAL — Create Bills
          ════════════════════════════════════════════ */}
      {showCreateConfirm && (
        <>
          <div className="modal-backdrop fade show" onClick={closeCreateConfirm} />
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header border-warning">
                  <h5 className="modal-title fw-bold">
                    📅 Create Bills for {MONTH_NAMES[month - 1]} {year}
                  </h5>
                  <button type="button" className="btn-close" onClick={closeCreateConfirm} disabled={genLoading} />
                </div>
                <div className="modal-body">
                  <p>
                    This will create <strong>PENDING bills</strong> for all active students
                    who don't have a bill for <strong>{MONTH_NAMES[month - 1]} {year}</strong> yet.
                  </p>
                  {data && (
                    <div className="card border bg-light mb-3">
                      <div className="card-body py-2 small">
                        <div className="d-flex justify-content-between">
                          <span>Students without bill yet:</span>
                          <strong className="text-warning">{newBillsCount}</strong>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span>Students with existing bill:</span>
                          <strong>{existingCount}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="alert alert-info py-2 small mb-0">
                    ℹ️ Safe to run multiple times — existing bills won't be duplicated.
                    Students without fee setup will be skipped.
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={closeCreateConfirm} disabled={genLoading}>
                    Cancel
                  </button>
                  <button className="btn btn-warning" onClick={confirmCreateBills} disabled={genLoading}>
                    {genLoading
                      ? <><span className="spinner-border spinner-border-sm me-2" />Creating...</>
                      : `✓ Create Bills`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AllFeeStatus;
