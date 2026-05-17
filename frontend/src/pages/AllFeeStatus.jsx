import { useState, useMemo } from "react";
import {
  getAllFeeStatus,
  generateAllFees,
  getStudentsWithNoConfig,
} from "../services/api";
import { toast } from "react-toastify";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function AllFeeStatus() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState(null);

  // ── ENHANCEMENT #4: No-config check state ────────────────────────
  const [noConfigData, setNoConfigData] = useState(null);
  const [noConfigLoading, setNoConfigLoading] = useState(false);

  const handleFetch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setData(null);
    setStatusFilter("ALL");
    setGenResult(null);
    setNoConfigData(null);
    try {
      const res = await getAllFeeStatus({ month, year });
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAll = async () => {
    setGenLoading(true);
    setGenResult(null);
    try {
      const res = await generateAllFees({ month, year });
      setGenResult(res.data);
      toast.success(
        `Generated: ${res.data.generated} | Skipped: ${res.data.skipped} | No Config: ${res.data.noConfig}`,
      );
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

  // ── ENHANCEMENT #4: Fetch students with no config ─────────────────
  const handleCheckNoConfig = async () => {
    setNoConfigLoading(true);
    setNoConfigData(null);
    try {
      const res = await getStudentsWithNoConfig();
      setNoConfigData(res.data);
      if (res.data.count === 0)
        toast.success("All students have fee config locked! ✅");
      else toast.warn(`${res.data.count} student(s) have no fee config`);
    } catch (err) {
      toast.error("Failed to fetch no-config students");
    } finally {
      setNoConfigLoading(false);
    }
  };

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
      "S.No",
      "Reg No",
      "Name",
      "Time Slot",
      "Total Fee",
      "Paid",
      "Balance",
      "Status",
      "Mode",
      "Receipt No",
    ];
    const rows = filtered.map((s, i) => [
      i + 1,
      s.regNo,
      s.studentName,
      s.timeSlot || "-",
      s.finalFee ?? "-",
      s.paidAmount ?? "-",
      s.balanceAmount ?? "-",
      s.paymentStatus,
      s.paymentMode || "-",
      s.receiptNumber || "-",
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fee-status-${MONTH_NAMES[month - 1]}-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── ENHANCEMENT #3: added NO_RECORD badge ────────────────────────
  const statusBadge = (s) => {
    if (s === "PAID") return <span className="badge badge-paid">✅ PAID</span>;
    if (s === "PARTIAL")
      return <span className="badge badge-partial">🔶 PARTIAL</span>;
    if (s === "NO_RECORD")
      return <span className="badge bg-danger">🚫 NO RECORD</span>;
    return <span className="badge badge-pending">⏳ PENDING</span>;
  };

  const countOf = (status) =>
    data?.students?.filter((s) => s.paymentStatus === status).length ?? 0;

  return (
    <div>
      <h2 className="page-title">📋 All Students Fee Status</h2>

      {/* Controls row */}
      <div className="form-section col-lg-10 mb-4">
        <form
          onSubmit={handleFetch}
          className="d-flex gap-3 align-items-end flex-wrap"
        >
          <div>
            <label className="form-label fw-bold">Month</label>
            <select
              className="form-select"
              value={month}
              onChange={(e) => {
                setMonth(Number(e.target.value));
                setGenResult(null);
                setNoConfigData(null);
              }}
            >
              {MONTH_NAMES.map((m, i) => (
                <option key={i} value={i + 1}>
                  {m}
                </option>
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
              onChange={(e) => {
                setYear(e.target.value);
                setGenResult(null);
                setNoConfigData(null);
              }}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Loading..." : "🔍 Fetch"}
          </button>
          <button
            type="button"
            className="btn btn-warning"
            onClick={handleGenerateAll}
            disabled={genLoading}
            title="Creates PENDING records for all active students who don't have one yet"
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
          {/* ENHANCEMENT #4: Check no-config students */}
          <button
            type="button"
            className="btn btn-outline-danger"
            onClick={handleCheckNoConfig}
            disabled={noConfigLoading}
            title="Shows students who have never had fee locked"
          >
            {noConfigLoading ? "Checking..." : "⚠️ Check No Config"}
          </button>
        </form>
      </div>

      {/* Generate All result */}
      {genResult && (
        <div className="alert alert-warning col-lg-10 mb-4">
          <h6 className="fw-bold mb-2">
            ⚡ Fee Generation — {MONTH_NAMES[genResult.month - 1]}{" "}
            {genResult.year}
          </h6>
          <div className="d-flex gap-4 flex-wrap mb-2">
            <span>
              <strong>Total Active:</strong> {genResult.totalActiveStudents}
            </span>
            <span>
              <strong className="text-success">✅ Generated:</strong>{" "}
              {genResult.generated}
            </span>
            <span>
              <strong className="text-secondary">⏭ Skipped:</strong>{" "}
              {genResult.skipped}
            </span>
            <span>
              <strong className="text-danger">⚠️ No Config:</strong>{" "}
              {genResult.noConfig}
            </span>
          </div>
          {genResult.noConfig > 0 && (
            <div>
              <small className="text-danger fw-bold">
                Lock fee for these students from Fee Calculate page:
              </small>
              <div className="mt-1 d-flex gap-2 flex-wrap">
                {genResult.noConfigRegNos.map((rn) => (
                  <span key={rn} className="badge bg-danger">
                    Reg #{rn}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ENHANCEMENT #4: No-config result */}
      {noConfigData && (
        <div
          className={`alert col-lg-10 mb-4 ${noConfigData.count > 0 ? "alert-danger" : "alert-success"}`}
        >
          <h6 className="fw-bold mb-2">⚠️ Students With No Fee Config</h6>
          <p className="mb-2">{noConfigData.message}</p>
          {noConfigData.count > 0 && (
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead className="table-dark">
                  <tr>
                    <th>Reg No</th>
                    <th>Name</th>
                    <th>Mobile</th>
                    <th>Time Slot</th>
                    <th>Admission Date</th>
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
          <button
            className="btn btn-sm btn-outline-secondary mt-2"
            onClick={() => setNoConfigData(null)}
          >
            ✕ Dismiss
          </button>
        </div>
      )}

      {data && (
        <div>
          {/* ENHANCEMENT #3: Summary badges with No Record count */}
          <div className="d-flex gap-2 mb-3 flex-wrap align-items-center">
            <span className="badge badge-paid px-3 py-2">
              ✅ Paid: {data.paidCount}
            </span>
            <span className="badge badge-partial px-3 py-2">
              🔶 Partial: {data.partialCount}
            </span>
            <span className="badge badge-pending px-3 py-2">
              ⏳ Pending: {data.pendingCount}
            </span>
            <span className="badge bg-danger px-3 py-2">
              🚫 No Record: {data.noRecordCount}
            </span>
            <span className="badge bg-dark px-3 py-2">
              Expected: ₹{data.totalFeeExpected} | Collected: ₹
              {data.totalCollected}
            </span>
          </div>

          {/* Filter + Export — ENHANCEMENT #3: added NO_RECORD filter */}
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <div className="d-flex gap-2 flex-wrap">
              {[
                { key: "ALL", label: `All (${data.students.length})` },
                { key: "PAID", label: `✅ Paid (${countOf("PAID")})` },
                { key: "PARTIAL", label: `🔶 Partial (${countOf("PARTIAL")})` },
                { key: "PENDING", label: `⏳ Pending (${countOf("PENDING")})` },
                {
                  key: "NO_RECORD",
                  label: `🚫 No Record (${countOf("NO_RECORD")})`,
                },
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
            <button
              className="btn btn-sm btn-outline-success"
              onClick={exportCSV}
            >
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
                    // ENHANCEMENT #3: NO_RECORD rows highlighted red
                    <tr
                      key={i}
                      className={
                        s.paymentStatus === "NO_RECORD" ? "table-danger" : ""
                      }
                    >
                      <td>{i + 1}</td>
                      <td className="fw-bold">{s.regNo}</td>
                      <td>{s.studentName}</td>
                      <td>{s.timeSlot || "—"}</td>
                      <td>{s.finalFee != null ? `₹${s.finalFee}` : "—"}</td>
                      <td>{s.paidAmount != null ? `₹${s.paidAmount}` : "—"}</td>
                      <td
                        className={
                          s.paymentStatus === "NO_RECORD"
                            ? ""
                            : s.balanceAmount > 0
                              ? "fw-bold text-danger"
                              : "text-success"
                        }
                      >
                        {s.balanceAmount != null ? `₹${s.balanceAmount}` : "—"}
                      </td>
                      <td>{statusBadge(s.paymentStatus)}</td>
                      <td>{s.paymentMode || "—"}</td>
                      <td className="text-muted small">
                        {s.receiptNumber || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.noRecordCount > 0 && (
            <div className="alert alert-danger mt-3 py-2">
              <small>
                ⚠️ <strong>{data.noRecordCount} students</strong> have no fee
                record for {MONTH_NAMES[month - 1]} {year}. Click{" "}
                <strong>⚡ Generate All Fees</strong> to create PENDING records
                for all at once.
              </small>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AllFeeStatus;
