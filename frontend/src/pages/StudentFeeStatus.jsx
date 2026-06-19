import { useState } from "react";
import { getStudentFeeStatus, searchStudents } from "../services/api";
import { toast } from "react-toastify";
import ReviseFeeModal from "../components/ReviseFeeModal";

// ── "01-May-2026" formatter ──────────────────────────
const formatDate = (iso) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const day   = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleString("en-US", { month: "short" });
    const year  = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return iso;
  }
};

// ── "Jun-2026" formatter ─────────────────────────────
const formatFeeMonth = (month, year) => {
  if (!month || !year) return "—";
  const d = new Date(year, month - 1, 1);
  return d.toLocaleString("en-US", { month: "short" }) + "-" + year;
};

// ── Payment mode badge ───────────────────────────────
const paymentModeBadge = (mode) => {
  if (!mode) return <span className="text-muted">—</span>;
  const map = {
    CASH:          { bg: "bg-success",            label: "💵 Cash" },
    UPI:           { bg: "bg-primary",            label: "📱 UPI" },
    ONLINE:        { bg: "bg-info",               label: "🌐 Online" },
    CHEQUE:        { bg: "bg-warning text-dark",  label: "🏦 Cheque" },
    BANK_TRANSFER: { bg: "bg-secondary",          label: "🔁 Bank Transfer" },
  };
  const cfg = map[mode.toUpperCase()] || { bg: "bg-secondary", label: mode };
  return <span className={`badge ${cfg.bg}`}>{cfg.label}</span>;
};

function StudentFeeStatus() {
  const [searchType,    setSearchType]    = useState("name");
  const [searchValue,   setSearchValue]   = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);

  // ── NEW: Revise fee modal state ──
  const [reviseTarget, setReviseTarget] = useState(null);

  const refreshAfterRevise = async () => {
    if (!data?.regNo) return;
    try {
      const res = await getStudentFeeStatus(data.regNo);
      setData(res.data);
    } catch {}
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchValue.trim()) { toast.error("Enter search value"); return; }
    setSearchLoading(true);
    setSearchResults(null);
    setData(null);
    try {
      const res = await searchStudents(searchType, searchValue.trim());
      setSearchResults(res.data);
      if (res.data.length === 0) toast.info("No students found");
    } catch (err) {
      toast.error(err.response?.data?.message || "Search failed");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectStudent = async (student) => {
    setSearchResults(null);
    setSearchValue("");
    setLoading(true);
    setData(null);
    try {
      const res = await getStudentFeeStatus(student.regNo);
      setData(res.data);
      toast.success(`Loaded: ${student.name}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load fee history");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setData(null);
    setSearchResults(null);
    setSearchValue("");
  };

  const statusBadge = (s) => {
    if (s === "PAID")    return <span className="badge bg-success">✅ PAID</span>;
    if (s === "PARTIAL") return <span className="badge bg-warning text-dark">🔶 PARTIAL</span>;
    return <span className="badge bg-secondary">⏳ PENDING</span>;
  };

  const overallBadge = (s) => {
    if (s === "ALL_PAID") return <span className="badge bg-success fs-6">✅ ALL PAID</span>;
    return <span className="badge bg-danger fs-6">⚠️ HAS PENDING</span>;
  };

  return (
    <div>
      <h2 className="page-title">📋 Student Details</h2>

      {/* ── Search form ── */}
      <div className="form-section col-lg-8 mb-4">
        <h5 className="fw-bold mb-3">🔍 Find Student</h5>
        <form onSubmit={handleSearch} className="row g-2">
          <div className="col-md-3">
            <select className="form-select" value={searchType}
              onChange={(e) => { setSearchType(e.target.value); setSearchValue(""); setSearchResults(null); }}>
              <option value="name">Name</option>
              <option value="regNo">Reg No</option>
              <option value="mobile">Mobile No</option>
            </select>
          </div>
          <div className="col-md-6">
            <input
              type={searchType === "regNo" ? "number" : "text"}
              className="form-control"
              placeholder={
                searchType === "regNo"  ? "Enter Reg No..."  :
                searchType === "mobile" ? "Enter mobile..."  : "Type student name..."
              }
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <button type="submit" className="btn btn-primary w-100" disabled={searchLoading}>
              {searchLoading ? "Searching..." : "🔍 Search"}
            </button>
          </div>
        </form>

        {/* ── Search results picker ── */}
        {searchResults && searchResults.length > 0 && (
          <div className="table-responsive mt-3">
            <table className="table table-sm table-hover">
              <thead className="table-dark">
                <tr>
                  <th>Reg No</th><th>Name</th><th>Father</th>
                  <th>Mobile</th><th>Time</th><th>Select</th>
                </tr>
              </thead>
              <tbody>
                {searchResults.map((s) => (
                  <tr key={s.regNo}>
                    <td>{s.regNo}</td>
                    <td>{s.name}</td>
                    <td>{s.fatherName || "-"}</td>
                    <td>{s.mobile}</td>
                    <td>{s.inTime && s.outTime ? `${s.inTime} - ${s.outTime}` : "—"}</td>
                    <td>
                      <button className="btn btn-sm btn-success" onClick={() => handleSelectStudent(s)}>
                        ✅ Select
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {loading && <div className="text-muted">⏳ Loading fee history...</div>}

      {data && (
        <div>
          {/* ── Student info card ── */}
          <div className="card shadow-sm border-0 mb-4 col-lg-10">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h4 className="fw-bold mb-1">{data.studentName}</h4>
                  <p className="text-muted mb-0 small">
                    {data.gender} &nbsp;|&nbsp; 📱 {data.mobile}
                  </p>
                </div>
                <button className="btn btn-sm btn-outline-secondary" onClick={handleReset}>
                  🔄 Search Again
                </button>
              </div>

              <hr />

              {/* Info row — 4 cards */}
              <div className="row g-3 text-center">
                <div className="col-md-3">
                  <div className="border rounded p-2">
                    <div className="text-muted small">Reg No</div>
                    <div className="fw-bold fs-5">#{data.regNo}</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="border rounded p-2">
                    <div className="text-muted small">Seat No</div>
                    <div className="fw-bold fs-5">{data.seatNo ? `🪑 ${data.seatNo}` : "—"}</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="border rounded p-2">
                    <div className="text-muted small">Time Slot</div>
                    <div className="fw-bold">{data.timeSlot || "—"}</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="border rounded p-2">
                    <div className="text-muted small">Student Status</div>
                    <div className="fw-bold">{data.isActive ? "✅ Active" : "❌ Inactive"}</div>
                  </div>
                </div>
              </div>

              <hr />

              {/* Fee summary row — 5 cards */}
              <div className="row g-2 text-center">
                <div className="col-md col-6">
                  <div className="border rounded p-2">
                    <div className="text-muted small">Joining Date</div>
                    <div className="fw-bold">{formatDate(data.dateOfAdmission)}</div>
                  </div>
                </div>
                <div className="col-md col-6">
                  <div className="border rounded p-2 bg-light">
                    <div className="text-muted small">Total Fee</div>
                    <div className="fw-bold fs-5">₹{data.totalFee}</div>
                  </div>
                </div>
                <div className="col-md col-6">
                  <div className="border rounded p-2" style={{ background: "#fef3c7" }}>
                    <div className="text-muted small">Discount</div>
                    <div className="fw-bold fs-5 text-warning">₹{data.monthlyDiscount || 0}</div>
                  </div>
                </div>
                <div className="col-md col-6">
                  <div className="border rounded p-2" style={{ background: "#d1fae5" }}>
                    <div className="text-muted small">Total Paid</div>
                    <div className="fw-bold fs-5 text-success">₹{data.totalPaid}</div>
                  </div>
                </div>
                <div className="col-md col-6">
                  <div className="border rounded p-2" style={{ background: "#fee2e2" }}>
                    <div className="text-muted small">Balance</div>
                    <div className="fw-bold fs-5 text-danger">₹{data.totalBalance}</div>
                  </div>
                </div>
              </div>

              <div className="mt-3 text-center">
                Overall Status: {overallBadge(data.overallStatus)}
              </div>
            </div>
          </div>

          {/* ── Monthly fee records table ── */}
          {data.monthlyRecords && data.monthlyRecords.length > 0 ? (
            <div className="table-responsive col-lg-10">
              <table className="table table-custom table-hover">
                <thead>
                  <tr>
                    <th>Fee Month</th>
                    <th>Payment Date</th>
                    <th>Slot</th>
                    <th>Monthly Fee</th>
                    <th>Discount</th>
                    <th>Admission Fee</th>
                    <th>Final Fee</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Payment Mode</th>
                    <th>Receipt</th>
                    <th>Revise</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthlyRecords.map((r, i) => (
                    <tr key={i} className={
                      r.paymentStatus === "PAID"    ? "table-success" :
                      r.paymentStatus === "PARTIAL" ? "table-warning" : ""
                    }>
                      {/* Fee Month — e.g. "Jun-2026" */}
                      <td className="fw-bold">{formatFeeMonth(r.feeMonth, r.feeYear)}</td>

                      {/* Payment Date — actual date money was received */}
                      <td>{formatDate(r.paymentDate)}</td>

                      <td>{r.inTime} - {r.outTime}</td>
                      <td>₹{r.monthlyFee}</td>
                      <td>{r.discountAmount > 0 ? `₹${r.discountAmount}` : "—"}</td>
                      <td>{r.admissionFee  > 0 ? `₹${r.admissionFee}`  : "—"}</td>
                      <td className="fw-bold">₹{r.finalFee}</td>
                      <td className="text-success">₹{r.paidAmount}</td>
                      <td className="text-danger fw-bold">₹{r.balanceAmount}</td>
                      <td>{statusBadge(r.paymentStatus)}</td>

                      {/* Payment Mode — coloured badge */}
                      <td>{paymentModeBadge(r.paymentMode)}</td>

                      <td><small className="text-muted">{r.receiptNumber || "—"}</small></td>

                      {/* NEW: Revise button */}
                      <td>
                        <button
                          className="btn btn-sm btn-outline-info"
                          onClick={() => setReviseTarget(r)}
                          title="Revise discount or admission fee"
                        >
                          ✏️ Revise
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="alert alert-warning col-lg-8">
              No fee records found for this student.
            </div>
          )}
        </div>
      )}

      {/* ── Revise Fee Modal ── */}
      {reviseTarget && (
        <ReviseFeeModal
          feeRecord={reviseTarget}
          onClose={() => setReviseTarget(null)}
          onSaved={refreshAfterRevise}
        />
      )}
    </div>
  );
}

export default StudentFeeStatus;
