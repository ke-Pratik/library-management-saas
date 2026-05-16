
// export default StudentFeeStatus;
import { useState } from "react";
import { getStudentFeeStatus, searchStudents } from "../services/api";
import { toast } from "react-toastify";

function StudentFeeStatus() {
  // ═══════════════════════════════════════
  // STUDENT SEARCH
  // ═══════════════════════════════════════
  const [searchType, setSearchType] = useState("name");
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // ═══════════════════════════════════════
  // SELECTED STUDENT DATA
  // ═══════════════════════════════════════
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // ═══════════════════════════════════════
  // SEARCH STUDENTS
  // ═══════════════════════════════════════
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchValue.trim()) {
      toast.error("Enter search value");
      return;
    }
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

  // ═══════════════════════════════════════
  // SELECT STUDENT → fetch fee history
  // ═══════════════════════════════════════
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

  // ═══════════════════════════════════════
  // RESET
  // ═══════════════════════════════════════
  const handleReset = () => {
    setData(null);
    setSearchResults(null);
    setSearchValue("");
  };

  // ═══════════════════════════════════════
  // STATUS BADGE
  // ═══════════════════════════════════════
  const statusBadge = (s) => {
    if (s === "PAID") return <span className="badge bg-success">✅ PAID</span>;
    if (s === "PARTIAL")
      return <span className="badge bg-warning text-dark">🔶 PARTIAL</span>;
    return <span className="badge bg-secondary">⏳ PENDING</span>;
  };

  const overallBadge = (s) => {
    if (s === "ALL_PAID")
      return <span className="badge bg-success fs-6">✅ ALL PAID</span>;
    return <span className="badge bg-danger fs-6">⚠️ HAS PENDING</span>;
  };

  return (
    <div>
      <h2 className="page-title">📋 Student Details</h2>

      {/* ─── SEARCH ──────────────────────────── */}
      <div className="form-section col-lg-8 mb-4">
        <h5 className="fw-bold mb-3">🔍 Find Student</h5>
        <form onSubmit={handleSearch} className="row g-2">
          <div className="col-md-3">
            <select
              className="form-select"
              value={searchType}
              onChange={(e) => {
                setSearchType(e.target.value);
                setSearchValue("");
                setSearchResults(null);
              }}
            >
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
                searchType === "regNo"
                  ? "Enter Reg No..."
                  : searchType === "mobile"
                    ? "Enter mobile number..."
                    : "Type student name..."
              }
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={searchLoading}
            >
              {searchLoading ? "Searching..." : "🔍 Search"}
            </button>
          </div>
        </form>

        {/* Search Results */}
        {searchResults && searchResults.length > 0 && (
          <div className="table-responsive mt-3">
            <table className="table table-sm table-hover">
              <thead className="table-dark">
                <tr>
                  <th>Reg No</th>
                  <th>Name</th>
                  <th>Father</th>
                  <th>Mobile</th>
                  <th>Time</th>
                  <th>Select</th>
                </tr>
              </thead>
              <tbody>
                {searchResults.map((s) => (
                  <tr key={s.regNo}>
                    <td>{s.regNo}</td>
                    <td>{s.name}</td>
                    <td>{s.fatherName || "-"}</td>
                    <td>{s.mobile}</td>
                    <td>
                      {s.inTime && s.outTime
                        ? `${s.inTime} - ${s.outTime}`
                        : "—"}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleSelectStudent(s)}
                      >
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

      {/* ─── STUDENT INFO CARD ───────────────── */}
      {data && (
        <div>
          {/* Summary Card */}
          <div className="card shadow-sm border-0 mb-4 col-lg-8">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h4 className="fw-bold mb-1">{data.studentName}</h4>
                  <p className="text-muted mb-0 small">
                    {data.gender} &nbsp;|&nbsp; 📱 {data.mobile}
                  </p>
                </div>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={handleReset}
                >
                  🔄 Search Again
                </button>
              </div>

              <hr />

              {/* Info Row */}
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
                    <div className="fw-bold fs-5">
                      {data.seatNo ? `🪑 ${data.seatNo}` : "—"}
                    </div>
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
                    <div className="fw-bold">
                      {data.isActive ? "✅ Active" : "❌ Inactive"}
                    </div>
                  </div>
                </div>
              </div>

              <hr />

              {/* Fee Summary Row */}
              <div className="row g-3 text-center">
                <div className="col-md-3">
                  <div className="border rounded p-2">
                    <div className="text-muted small">Total Months</div>
                    <div className="fw-bold fs-5">{data.totalMonths}</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="border rounded p-2 bg-light">
                    <div className="text-muted small">Total Fee</div>
                    <div className="fw-bold fs-5">₹{data.totalFee}</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div
                    className="border rounded p-2"
                    style={{ background: "#d1fae5" }}
                  >
                    <div className="text-muted small">Total Paid</div>
                    <div className="fw-bold fs-5 text-success">
                      ₹{data.totalPaid}
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div
                    className="border rounded p-2"
                    style={{ background: "#fee2e2" }}
                  >
                    <div className="text-muted small">Balance</div>
                    <div className="fw-bold fs-5 text-danger">
                      ₹{data.totalBalance}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 text-center">
                Overall Status: {overallBadge(data.overallStatus)}
              </div>
            </div>
          </div>

          {/* ─── FEE HISTORY TABLE ───────────── */}
          {data.monthlyRecords && data.monthlyRecords.length > 0 ? (
            <div className="table-responsive col-lg-8">
              <table className="table table-custom table-hover">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Slot</th>
                    <th>Monthly Fee</th>
                    <th>Admission Fee</th>
                    <th>Final Fee</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthlyRecords.map((r, i) => (
                    <tr
                      key={i}
                      className={
                        r.paymentStatus === "PAID"
                          ? "table-success"
                          : r.paymentStatus === "PARTIAL"
                            ? "table-warning"
                            : ""
                      }
                    >
                      <td className="fw-bold">
                        {r.feeMonth}/{r.feeYear}
                      </td>
                      <td>
                        {r.inTime} - {r.outTime}
                      </td>
                      <td>₹{r.monthlyFee}</td>
                      <td>{r.admissionFee > 0 ? `₹${r.admissionFee}` : "—"}</td>
                      <td className="fw-bold">₹{r.finalFee}</td>
                      <td className="text-success">₹{r.paidAmount}</td>
                      <td className="text-danger fw-bold">
                        ₹{r.balanceAmount}
                      </td>
                      <td>{statusBadge(r.paymentStatus)}</td>
                      <td>
                        <small className="text-muted">
                          {r.receiptNumber || "—"}
                        </small>
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
    </div>
  );
}

export default StudentFeeStatus;
