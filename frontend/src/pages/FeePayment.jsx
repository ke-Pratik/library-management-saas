import { useState } from "react";
import {
  recordPayment,
  getStudentFeeStatus,
  searchStudents,
  autoGenerateFee,
} from "../services/api";
import { toast } from "react-toastify";

function FeePayment() {
  const now = new Date();

  // ═══════════════════════════════════════
  // STUDENT SEARCH
  // ═══════════════════════════════════════
  const [studentSearchType, setStudentSearchType]     = useState("name");
  const [studentSearchValue, setStudentSearchValue]   = useState("");
  const [searchResults, setSearchResults]             = useState(null);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);

  const [isStudentSelected, setIsStudentSelected]     = useState(false);
  const [selectedStudentInfo, setSelectedStudentInfo] = useState(null);

  // ═══════════════════════════════════════
  // FEE RECORDS for selected student
  // ═══════════════════════════════════════
  const [feeData, setFeeData]       = useState(null);
  const [feeLoading, setFeeLoading] = useState(false);

  // ═══════════════════════════════════════
  // PAYMENT FORM
  // ═══════════════════════════════════════
  const [form, setForm] = useState({
    regNo:       "",
    feeMonth:    now.getMonth() + 1,
    feeYear:     now.getFullYear(),
    payAmount:   "",
    paymentMode: "CASH",
    remarks:     "",
  });
  const [payLoading, setPayLoading] = useState(false);
  const [result, setResult]         = useState(null);

  // ═══════════════════════════════════════
  // SEARCH STUDENTS
  // ═══════════════════════════════════════
  const handleStudentSearch = async (e) => {
    e.preventDefault();
    if (!studentSearchValue.trim()) { toast.error("Enter search value"); return; }
    setStudentSearchLoading(true);
    setSearchResults(null);
    try {
      const res = await searchStudents(studentSearchType, studentSearchValue.trim());
      setSearchResults(res.data);
      if (res.data.length === 0) toast.info("No active students found");
    } catch (err) {
      toast.error(err.response?.data?.message || "Search failed");
    } finally {
      setStudentSearchLoading(false);
    }
  };

  // ═══════════════════════════════════════
  // SELECT STUDENT — auto-generate + fetch records
  // ═══════════════════════════════════════
  const handleSelectStudent = async (student) => {
    setIsStudentSelected(true);
    setSelectedStudentInfo(student);
    setSearchResults(null);
    setStudentSearchValue("");
    setResult(null);
    setForm((prev) => ({
      ...prev,
      regNo:    student.regNo.toString(),
      payAmount: "",
    }));

    toast.success(`Selected: ${student.name}`);

    // Step 1: Auto-generate current month fee if not already created
    setFeeLoading(true);
    try {
      await autoGenerateFee(student.regNo);
      // "already exists" or "created" — either way we proceed to fetch
    } catch (err) {
      const msg = err.response?.data?.message || "";
      // "No fee config found" means fee was never locked — warn but don't block
      if (msg.includes("No fee config")) {
        toast.warn("Fee not locked yet for this student. Go to Fee Calculate page first.");
      }
      // Other errors — log quietly, still fetch whatever records exist
    }

    // Step 2: Fetch full fee history
    try {
      const res = await getStudentFeeStatus(student.regNo);
      setFeeData(res.data);
    } catch (err) {
      toast.error("Could not load fee records");
    } finally {
      setFeeLoading(false);
    }
  };

  // ═══════════════════════════════════════
  // CHANGE STUDENT
  // ═══════════════════════════════════════
  const handleChangeStudent = () => {
    setIsStudentSelected(false);
    setSelectedStudentInfo(null);
    setFeeData(null);
    setSearchResults(null);
    setStudentSearchValue("");
    setResult(null);
    setForm((prev) => ({ ...prev, regNo: "", payAmount: "" }));
  };

  // ═══════════════════════════════════════
  // QUICK FILL from pending record row
  // ═══════════════════════════════════════
  const handleQuickFill = (record) => {
    setForm((prev) => ({
      ...prev,
      feeMonth:  record.feeMonth,
      feeYear:   record.feeYear,
      payAmount: record.balanceAmount,
    }));
    toast.info(`Filled for ${record.feeMonth}/${record.feeYear}`);
  };

  // ═══════════════════════════════════════
  // RECORD PAYMENT
  // ═══════════════════════════════════════
  const handleSubmit = async (e) => {
    e.preventDefault();
    setPayLoading(true);
    setResult(null);
    try {
      const payload = {
        regNo:       Number(form.regNo),
        feeMonth:    Number(form.feeMonth),
        feeYear:     Number(form.feeYear),
        payAmount:   Number(form.payAmount),
        paymentMode: form.paymentMode,
        remarks:     form.remarks || null,
      };
      const res = await recordPayment(payload);
      setResult(res.data);
      toast.success(res.data.message);

      // Refresh fee records after payment
      const updated = await getStudentFeeStatus(Number(form.regNo));
      setFeeData(updated.data);

      setForm((prev) => ({ ...prev, payAmount: "", remarks: "" }));
    } catch (err) {
      toast.error(err.response?.data?.message || "Payment failed");
    } finally {
      setPayLoading(false);
    }
  };

  // ═══════════════════════════════════════
  // STATUS BADGE
  // ═══════════════════════════════════════
  const statusBadge = (s) => {
    if (s === "PAID")    return <span className="badge bg-success">✅ PAID</span>;
    if (s === "PARTIAL") return <span className="badge bg-warning text-dark">🔶 PARTIAL</span>;
    return <span className="badge bg-secondary">⏳ PENDING</span>;
  };

  return (
    <div>
      <h2 className="page-title">💳 Record Payment</h2>

      {/* ─── STEP 1: Find Student ─────────────── */}
      <div className="form-section col-lg-9 mb-4">
        <h5 className="fw-bold mb-2">Step 1: Find Student</h5>
        <p className="text-muted small mb-3">
          Search by Name, Reg No, or Mobile. Current month fee will be auto-generated on selection.
        </p>

        {!isStudentSelected ? (
          <>
            <form onSubmit={handleStudentSearch} className="row g-2 mb-3">
              <div className="col-md-3">
                <select className="form-select" value={studentSearchType}
                  onChange={(e) => {
                    setStudentSearchType(e.target.value);
                    setStudentSearchValue("");
                    setSearchResults(null);
                  }}>
                  <option value="name">Name</option>
                  <option value="regNo">Reg No</option>
                  <option value="mobile">Mobile No</option>
                </select>
              </div>
              <div className="col-md-6">
                <input
                  type={studentSearchType === "regNo" ? "number" : "text"}
                  className="form-control"
                  placeholder={
                    studentSearchType === "regNo"   ? "Enter Reg No..." :
                    studentSearchType === "mobile"  ? "Enter mobile number..." :
                    "Type student name..."
                  }
                  value={studentSearchValue}
                  onChange={(e) => setStudentSearchValue(e.target.value)} />
              </div>
              <div className="col-md-3">
                <button type="submit" className="btn btn-outline-primary w-100"
                  disabled={studentSearchLoading}>
                  {studentSearchLoading ? "..." : "🔍 Search"}
                </button>
              </div>
            </form>

            {searchResults && searchResults.length > 0 && (
              <div className="table-responsive">
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
                        <td>
                          {s.inTime && s.outTime
                            ? `${s.inTime} - ${s.outTime}`
                            : <span className="text-muted">—</span>}
                        </td>
                        <td>
                          <button className="btn btn-sm btn-success"
                            onClick={() => handleSelectStudent(s)}>
                            ✅ Select
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          // Selected student banner
          <div className="alert alert-info py-2 d-flex justify-content-between align-items-center">
            <span>
              👤 <strong>{selectedStudentInfo?.name}</strong>
              {selectedStudentInfo?.gender && ` | ${selectedStudentInfo.gender}`}
              {` | Reg No: ${selectedStudentInfo?.regNo}`}
              {selectedStudentInfo?.mobile && ` | 📱 ${selectedStudentInfo.mobile}`}
            </span>
            <button className="btn btn-sm btn-outline-warning" onClick={handleChangeStudent}>
              Change Student
            </button>
          </div>
        )}

        {/* Fee records table */}
        {feeLoading && (
          <div className="text-muted small mt-2">⏳ Loading fee records...</div>
        )}

        {feeData && (
          <div className="mt-3">
            <div className="alert alert-secondary py-2">
              <strong>{feeData.studentName}</strong> (Reg: {feeData.regNo}) &nbsp;|&nbsp;
              Total: ₹{feeData.totalFee} &nbsp;|&nbsp;
              Paid: <span className="text-success fw-bold">₹{feeData.totalPaid}</span> &nbsp;|&nbsp;
              Balance: <span className="text-danger fw-bold">₹{feeData.totalBalance}</span>
            </div>

            {feeData.monthlyRecords && feeData.monthlyRecords.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-sm table-hover">
                  <thead className="table-dark">
                    <tr>
                      <th>Month</th><th>Slot</th><th>Fee</th>
                      <th>Admission</th><th>Paid</th><th>Balance</th>
                      <th>Status</th><th>Quick Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeData.monthlyRecords.map((r, i) => (
                      <tr key={i}
                        className={
                          r.paymentStatus === "PAID"    ? "table-success" :
                          r.paymentStatus === "PARTIAL" ? "table-warning" : ""
                        }>
                        <td className="fw-bold">{r.feeMonth}/{r.feeYear}</td>
                        <td>{r.inTime} - {r.outTime}</td>
                        <td>₹{r.finalFee}</td>
                        <td>{r.admissionFee > 0 ? `₹${r.admissionFee}` : "—"}</td>
                        <td>₹{r.paidAmount}</td>
                        <td className="fw-bold">₹{r.balanceAmount}</td>
                        <td>{statusBadge(r.paymentStatus)}</td>
                        <td>
                          {r.paymentStatus !== "PAID" && (
                            <button className="btn btn-sm btn-outline-success"
                              onClick={() => handleQuickFill(r)}>
                              💰 Fill
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="alert alert-warning">
                No fee records found. Please lock fee first on the <strong>Fee Calculate</strong> page.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── STEP 2: Payment Form ─────────────── */}
      <div className="form-section col-lg-8 mb-4">
        <h5 className="fw-bold mb-3">Step 2: Make Payment</h5>
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label fw-bold">Reg No *</label>
              <input type="number" className="form-control"
                value={form.regNo}
                onChange={(e) => setForm({ ...form, regNo: e.target.value })}
                disabled={isStudentSelected}
                required />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-bold">Month *</label>
              <input type="number" className="form-control" min="1" max="12"
                value={form.feeMonth}
                onChange={(e) => setForm({ ...form, feeMonth: e.target.value })}
                required />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-bold">Year *</label>
              <input type="number" className="form-control"
                value={form.feeYear}
                onChange={(e) => setForm({ ...form, feeYear: e.target.value })}
                required />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-bold">Pay Amount (₹) *</label>
              <input type="number" step="0.01" className="form-control"
                value={form.payAmount}
                onChange={(e) => setForm({ ...form, payAmount: e.target.value })}
                required />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-bold">Payment Mode *</label>
              <select className="form-select" value={form.paymentMode}
                onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}>
                <option value="CASH">💵 Cash</option>
                <option value="ONLINE">💳 Online</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label fw-bold">Remarks</label>
              <input type="text" className="form-control"
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-success px-4" disabled={payLoading}>
                {payLoading ? "Processing..." : "💰 Record Payment"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ─── PAYMENT RESULT ──────────────────── */}
      {result && (
        <div className="result-card success col-lg-8">
          <h5 className="fw-bold">✅ {result.message}</h5>
          <table className="table table-sm mt-3">
            <tbody>
              <tr>
                <td>Receipt No</td>
                <td className="fw-bold text-primary fs-5">{result.receiptNumber}</td>
              </tr>
              <tr>
                <td>Student</td>
                <td>{result.studentName} (Reg: {result.regNo})</td>
              </tr>
              <tr>
                <td>Month</td>
                <td>{result.feeMonth}/{result.feeYear}</td>
              </tr>
              <tr>
                <td>Final Fee</td>
                <td>₹{result.finalFee}</td>
              </tr>
              <tr>
                <td>Paid Now</td>
                <td className="text-success fw-bold fs-5">₹{result.amountPaidNow}</td>
              </tr>
              <tr>
                <td>Total Paid So Far</td>
                <td>₹{result.totalPaidSoFar}</td>
              </tr>
              <tr>
                <td>Balance</td>
                <td className={result.balanceRemaining > 0 ? "text-danger fw-bold" : "text-success fw-bold"}>
                  ₹{result.balanceRemaining}
                </td>
              </tr>
              <tr>
                <td>Status</td>
                <td>
                  <span className={`badge fs-6 ${result.paymentStatus === "PAID" ? "bg-success" : "bg-warning text-dark"}`}>
                    {result.paymentStatus === "PAID" ? "✅ FULLY PAID" : "🔶 PARTIAL"}
                  </span>
                </td>
              </tr>
              <tr>
                <td>Mode</td>
                <td>{result.paymentMode}</td>
              </tr>
              <tr>
                <td>Date</td>
                <td>{result.paymentDate}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default FeePayment;
