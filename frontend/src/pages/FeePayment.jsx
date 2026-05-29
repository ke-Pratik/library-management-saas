import { useState } from "react";
import {
  recordPayment,
  getStudentFeeStatus,
  searchStudents,
  autoGenerateFee,
  reversePayment,
  getWallet,
} from "../services/api";
import { toast } from "react-toastify";
import AdvancePaymentModal from "../components/AdvancePaymentModal";
import ReviseFeeModal from "../components/ReviseFeeModal";
import WalletModal from "../components/WalletModal";

// ── Date formatter: ISO "2026-05-01" → "01-May-2026" ──
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

function FeePayment() {
  const now = new Date();

  // STUDENT SEARCH
  const [studentSearchType, setStudentSearchType] = useState("name");
  const [studentSearchValue, setStudentSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);

  const [isStudentSelected, setIsStudentSelected] = useState(false);
  const [selectedStudentInfo, setSelectedStudentInfo] = useState(null);

  // FEE RECORDS
  const [feeData, setFeeData] = useState(null);
  const [feeLoading, setFeeLoading] = useState(false);

  // PAYMENT FORM
  const [form, setForm] = useState({
    regNo: "",
    feeMonth: now.getMonth() + 1,
    feeYear: now.getFullYear(),
    payAmount: "",
    paymentMode: "CASH",
    remarks: "",
  });
  const [payLoading, setPayLoading] = useState(false);
  const [result, setResult] = useState(null);

  // MODALS
  const [showAdvance, setShowAdvance] = useState(false);
  const [reviseTarget, setReviseTarget] = useState(null);

  // WALLET
  const [walletBalance, setWalletBalance] = useState(null);
  const [showWallet, setShowWallet] = useState(false);

  // REVERSE
  const [reverseLoading, setReverseLoading] = useState(null);

  // ═══════════════════════════════════════
  // SEARCH STUDENTS
  // ═══════════════════════════════════════
  const handleStudentSearch = async (e) => {
    e.preventDefault();
    if (!studentSearchValue.trim()) {
      toast.error("Enter search value");
      return;
    }
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
  // SELECT STUDENT
  // ═══════════════════════════════════════
  const handleSelectStudent = async (student) => {
    setIsStudentSelected(true);
    setSelectedStudentInfo(student);
    setSearchResults(null);
    setStudentSearchValue("");
    setResult(null);
    setForm((prev) => ({
      ...prev,
      regNo: student.regNo.toString(),
      payAmount: "",
    }));

    toast.success(`Selected: ${student.name}`);

    setFeeLoading(true);
    try {
      await autoGenerateFee(student.regNo);
    } catch (err) {
      const msg = err.response?.data?.message || "";
      if (msg.includes("No fee config")) {
        toast.warn("Fee not locked yet for this student. Go to Fee Calculate page first.");
      }
    }

    try {
      const res = await getStudentFeeStatus(student.regNo);
      setFeeData(res.data);
    } catch (err) {
      toast.error("Could not load fee records");
    } finally {
      setFeeLoading(false);
    }

    // Wallet balance
    try {
      const w = await getWallet(student.regNo);
      setWalletBalance(w.data.balance);
    } catch {
      // silently ignore
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
    setWalletBalance(null);
    setShowWallet(false);
  };

  const handleQuickFill = (record) => {
    setForm((prev) => ({
      ...prev,
      feeMonth: record.feeMonth,
      feeYear: record.feeYear,
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
        regNo: Number(form.regNo),
        feeMonth: Number(form.feeMonth),
        feeYear: Number(form.feeYear),
        payAmount: Number(form.payAmount),
        paymentMode: form.paymentMode,
        remarks: form.remarks || null,
      };
      const res = await recordPayment(payload);
      setResult(res.data);
      toast.success(res.data.message);

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
  // REFRESH (fee + wallet) — used by modals
  // ═══════════════════════════════════════
  const refreshFeeData = async () => {
    if (!selectedStudentInfo) return;
    try {
      const updated = await getStudentFeeStatus(selectedStudentInfo.regNo);
      setFeeData(updated.data);
      const w = await getWallet(selectedStudentInfo.regNo);
      setWalletBalance(w.data.balance);
    } catch {
      toast.error("Could not refresh fee records");
    }
  };

  // ═══════════════════════════════════════
  // PRINT RECEIPT
  // ═══════════════════════════════════════
  const handlePrintReceipt = () => {
    const win = window.open("", "_blank", "width=440,height=640");
    win.document.write(`
      <html>
      <head>
        <title>Receipt - ${result.receiptNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 28px; max-width: 380px; margin: auto; }
          .center { text-align: center; }
          .org  { font-size: 20px; font-weight: bold; letter-spacing: 1px; }
          .sub  { font-size: 12px; color: #666; margin-top: 2px; }
          .dash { border-top: 2px dashed #aaa; margin: 12px 0; }
          table { width: 100%; border-collapse: collapse; }
          td    { padding: 5px 2px; font-size: 13px; vertical-align: top; }
          td:first-child { color: #555; width: 48%; }
          .big  { font-size: 20px; font-weight: bold; color: #198754; }
          .bal  { font-size: 16px; font-weight: bold;
                  color: ${result.balanceRemaining > 0 ? "#dc3545" : "#198754"}; }
          .pill { display: inline-block; padding: 3px 10px; border-radius: 4px;
                  font-size: 12px; font-weight: bold;
                  background: ${result.paymentStatus === "PAID" ? "#198754" : "#ffc107"};
                  color: ${result.paymentStatus === "PAID" ? "#fff" : "#333"}; }
          .foot { font-size: 11px; color: #999; text-align: center; margin-top: 18px; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="org">MAA VIDYA LIBRARY</div>
          <div class="sub">Fee Payment Receipt</div>
        </div>
        <div class="dash"></div>
        <table>
          <tr><td>Receipt No</td><td><strong>${result.receiptNumber}</strong></td></tr>
          <tr><td>Date</td><td>${result.paymentDate}</td></tr>
        </table>
        <div class="dash"></div>
        <table>
          <tr><td>Student Name</td><td>${result.studentName}</td></tr>
          <tr><td>Reg No</td><td>${result.regNo}</td></tr>
          <tr><td>Fee Month</td><td>${result.feeMonth} / ${result.feeYear}</td></tr>
        </table>
        <div class="dash"></div>
        <table>
          <tr><td>Total Fee</td><td>₹${result.finalFee}</td></tr>
          <tr><td>Paid Now</td><td class="big">₹${result.amountPaidNow}</td></tr>
          <tr><td>Total Paid So Far</td><td>₹${result.totalPaidSoFar}</td></tr>
          <tr><td>Balance Remaining</td><td class="bal">₹${result.balanceRemaining}</td></tr>
          <tr><td>Payment Mode</td><td>${result.paymentMode}</td></tr>
          <tr><td>Status</td><td><span class="pill">${result.paymentStatus}</span></td></tr>
        </table>
        <div class="dash"></div>
        <div class="foot">Thank you for your payment!<br>Please keep this receipt for your records.</div>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  // ═══════════════════════════════════════
  // REPRINT
  // ═══════════════════════════════════════
  const handleReprintReceipt = (r) => {
    const win = window.open("", "_blank", "width=440,height=660");
    win.document.write(`
      <html>
      <head>
        <title>Receipt - ${r.receiptNumber}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:Arial,sans-serif; padding:28px; max-width:380px; margin:auto; }
          .center { text-align:center; }
          .org  { font-size:20px; font-weight:bold; letter-spacing:1px; }
          .sub  { font-size:12px; color:#666; margin-top:2px; }
          .dash { border-top:2px dashed #aaa; margin:12px 0; }
          table { width:100%; border-collapse:collapse; }
          td    { padding:5px 2px; font-size:13px; vertical-align:top; }
          td:first-child { color:#555; width:48%; }
          .big  { font-size:20px; font-weight:bold; color:#198754; }
          .bal  { font-size:16px; font-weight:bold;
                  color:${Number(r.balanceAmount) > 0 ? "#dc3545" : "#198754"}; }
          .pill { display:inline-block; padding:3px 10px; border-radius:4px;
                  font-size:12px; font-weight:bold;
                  background:${r.paymentStatus === "PAID" ? "#198754" : "#ffc107"};
                  color:${r.paymentStatus === "PAID" ? "#fff" : "#333"}; }
          .foot { font-size:11px; color:#999; text-align:center; margin-top:18px; }
          .reprint { font-size:10px; color:#aaa; text-align:center; margin-top:6px; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="org">MAA VIDYA LIBRARY</div>
          <div class="sub">Fee Payment Receipt</div>
        </div>
        <div class="dash"></div>
        <table>
          <tr><td>Receipt No</td><td><strong>${r.receiptNumber}</strong></td></tr>
          <tr><td>Payment Date</td><td>${r.paymentDate || "—"}</td></tr>
        </table>
        <div class="dash"></div>
        <table>
          <tr><td>Student Name</td><td>${feeData.studentName}</td></tr>
          <tr><td>Reg No</td><td>${feeData.regNo}</td></tr>
          <tr><td>Fee Month</td><td>${r.feeMonth} / ${r.feeYear}</td></tr>
        </table>
        <div class="dash"></div>
        <table>
          <tr><td>Total Fee</td><td>₹${r.finalFee}</td></tr>
          <tr><td>Amount Paid</td><td class="big">₹${r.paidAmount}</td></tr>
          <tr><td>Balance</td><td class="bal">₹${r.balanceAmount}</td></tr>
          <tr><td>Mode</td><td>${r.paymentMode || "—"}</td></tr>
          <tr><td>Status</td><td><span class="pill">${r.paymentStatus}</span></td></tr>
        </table>
        <div class="dash"></div>
        <div class="foot">Thank you for your payment!<br>Keep this receipt for your records.</div>
        <div class="reprint">*** REPRINT ***</div>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  // ═══════════════════════════════════════
  // REVERSE
  // ═══════════════════════════════════════
  const handleReverse = async (r) => {
    const confirmed = window.confirm(
      `⚠️ Reverse payment for ${r.feeMonth}/${r.feeYear}?\n\n` +
        `This will reset ₹${r.paidAmount} → PENDING.\n` +
        `Action cannot be undone automatically.`,
    );
    if (!confirmed) return;

    setReverseLoading(r.feeId);
    try {
      const res = await reversePayment(r.feeId, { remarks: "Reversed via admin panel" });
      toast.success(res.data.message);
      const updated = await getStudentFeeStatus(Number(form.regNo));
      setFeeData(updated.data);
      setResult(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Reverse failed");
    } finally {
      setReverseLoading(null);
    }
  };

  const statusBadge = (s) => {
    if (s === "PAID") return <span className="badge bg-success">✅ PAID</span>;
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
                <select
                  className="form-select"
                  value={studentSearchType}
                  onChange={(e) => {
                    setStudentSearchType(e.target.value);
                    setStudentSearchValue("");
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
                  type={studentSearchType === "regNo" ? "number" : "text"}
                  className="form-control"
                  placeholder={
                    studentSearchType === "regNo"
                      ? "Enter Reg No..."
                      : studentSearchType === "mobile"
                        ? "Enter mobile number..."
                        : "Type student name..."
                  }
                  value={studentSearchValue}
                  onChange={(e) => setStudentSearchValue(e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <button type="submit" className="btn btn-outline-primary w-100" disabled={studentSearchLoading}>
                  {studentSearchLoading ? "..." : "🔍 Search"}
                </button>
              </div>
            </form>

            {searchResults && searchResults.length > 0 && (
              <div className="table-responsive">
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
                          {s.inTime && s.outTime ? `${s.inTime} - ${s.outTime}` : <span className="text-muted">—</span>}
                        </td>
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
          </>
        ) : (
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

        {feeLoading && (
          <div className="text-muted small mt-2">⏳ Loading fee records...</div>
        )}

        {feeData && (
          <div className="mt-3">
            <div className="alert alert-secondary py-2">
              <strong>{feeData.studentName}</strong> (Reg: {feeData.regNo})
              &nbsp;|&nbsp; Total: ₹{feeData.totalFee} &nbsp;|&nbsp; Paid:{" "}
              <span className="text-success fw-bold">₹{feeData.totalPaid}</span>
              &nbsp;|&nbsp; Balance:{" "}
              <span className="text-danger fw-bold">₹{feeData.totalBalance}</span>
            </div>

            {/* ── Wallet card ────────────────────────────── */}
            {walletBalance !== null && (
              <div className={`alert ${Number(walletBalance) > 0 ? "alert-warning" : "alert-light"} py-2 d-flex justify-content-between align-items-center`}>
                <span>
                  💰 <strong>Wallet Balance:</strong>{" "}
                  <span className={Number(walletBalance) > 0 ? "fw-bold text-success" : "text-muted"}>
                    Rs.{Number(walletBalance).toFixed(2)}
                  </span>
                  {Number(walletBalance) > 0 && (
                    <span className="text-muted small ms-2">— credit available</span>
                  )}
                </span>
                <button className="btn btn-sm btn-outline-primary" onClick={() => setShowWallet(true)}>
                  📜 View / Refund
                </button>
              </div>
            )}

            {feeData.monthlyRecords && feeData.monthlyRecords.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-sm table-hover">
                  <thead className="table-dark">
                    <tr>
                      <th>Date</th>
                      <th>Slot</th>
                      <th>Fee</th>
                      <th>Discount</th>
                      <th>Admission</th>
                      <th>Paid</th>
                      <th>Balance</th>
                      <th>Status</th>
                      <th>Quick Pay</th>
                      <th>Reverse</th>
                      <th>Revise</th>
                      <th>Reprint</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeData.monthlyRecords.map((r, i) => (
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
                        <td className="fw-bold">{formatDate(r.joiningDateInMonth)}</td>
                        <td>{r.inTime} - {r.outTime}</td>
                        <td>₹{r.finalFee}</td>
                        <td>{r.discountAmount > 0 ? `₹${r.discountAmount}` : "—"}</td>
                        <td>{r.admissionFee > 0 ? `₹${r.admissionFee}` : "—"}</td>
                        <td>₹{r.paidAmount}</td>
                        <td className="fw-bold">₹{r.balanceAmount}</td>
                        <td>{statusBadge(r.paymentStatus)}</td>

                        <td>
                          {r.paymentStatus !== "PAID" && (
                            <button className="btn btn-sm btn-outline-success" onClick={() => handleQuickFill(r)}>
                              💰 Fill
                            </button>
                          )}
                        </td>

                        <td>
                          {(r.paymentStatus === "PAID" || r.paymentStatus === "PARTIAL") && (
                            <button
                              className="btn btn-sm btn-outline-danger"
                              disabled={reverseLoading === r.feeId}
                              onClick={() => handleReverse(r)}
                            >
                              {reverseLoading === r.feeId ? (
                                <span className="spinner-border spinner-border-sm" />
                              ) : "↩️ Reverse"}
                            </button>
                          )}
                        </td>

                        <td>
                          <button
                            className="btn btn-sm btn-outline-info"
                            onClick={() => setReviseTarget(r)}
                            title="Revise discount or admission fee on this bill"
                          >
                            ✏️ Revise
                          </button>
                        </td>

                        <td>
                          {r.receiptNumber && (
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleReprintReceipt(r)}
                              title={`Reprint ${r.receiptNumber}`}
                            >
                              🖨️
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
              <input
                type="number" className="form-control"
                value={form.regNo}
                onChange={(e) => setForm({ ...form, regNo: e.target.value })}
                disabled={isStudentSelected} required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-bold">Month *</label>
              <input
                type="number" className="form-control" min="1" max="12"
                value={form.feeMonth}
                onChange={(e) => setForm({ ...form, feeMonth: e.target.value })}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-bold">Year *</label>
              <input
                type="number" className="form-control"
                value={form.feeYear}
                onChange={(e) => setForm({ ...form, feeYear: e.target.value })}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-bold">Pay Amount (₹) *</label>
              <input
                type="number" step="0.01" className="form-control"
                value={form.payAmount}
                onChange={(e) => setForm({ ...form, payAmount: e.target.value })}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-bold">Payment Mode *</label>
              <select
                className="form-select"
                value={form.paymentMode}
                onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
              >
                <option value="CASH">💵 Cash</option>
                <option value="ONLINE">💳 Online</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label fw-bold">Remarks</label>
              <input
                type="text" className="form-control"
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              />
            </div>
            <div className="col-12 d-flex flex-wrap gap-2">
              <button type="submit" className="btn btn-success px-4" disabled={payLoading}>
                {payLoading ? "Processing..." : "💰 Record Payment"}
              </button>

              <button
                type="button"
                className="btn btn-outline-success px-4"
                disabled={!isStudentSelected}
                onClick={() => setShowAdvance(true)}
                title={!isStudentSelected ? "Select a student first" : "Pay for multiple months in one go"}
              >
                💰 Pay Advance (Multi-Month)
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
              <tr><td>Receipt No</td><td className="fw-bold text-primary fs-5">{result.receiptNumber}</td></tr>
              <tr><td>Student</td><td>{result.studentName} (Reg: {result.regNo})</td></tr>
              <tr><td>Month</td><td>{result.feeMonth}/{result.feeYear}</td></tr>
              <tr><td>Final Fee</td><td>₹{result.finalFee}</td></tr>
              <tr><td>Paid Now</td><td className="text-success fw-bold fs-5">₹{result.amountPaidNow}</td></tr>
              <tr><td>Total Paid So Far</td><td>₹{result.totalPaidSoFar}</td></tr>
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
              <tr><td>Mode</td><td>{result.paymentMode}</td></tr>
              <tr><td>Date</td><td>{result.paymentDate}</td></tr>
            </tbody>
          </table>

          <div className="mt-3">
            <button className="btn btn-outline-primary" onClick={handlePrintReceipt}>
              🖨️ Print / Save Receipt
            </button>
          </div>
        </div>
      )}

      {/* ─── ADVANCE PAYMENT MODAL — keep open after save ─── */}
      {showAdvance && selectedStudentInfo && (
        <AdvancePaymentModal
          student={selectedStudentInfo}
          onClose={() => setShowAdvance(false)}
          onSaved={async () => {
            await refreshFeeData();
          }}
        />
      )}

      {/* ─── REVISE FEE MODAL — keep open after save ─── */}
      {reviseTarget && (
        <ReviseFeeModal
          feeRecord={reviseTarget}
          onClose={() => setReviseTarget(null)}
          onSaved={async () => {
            await refreshFeeData();
          }}
        />
      )}

      {/* ─── WALLET MODAL ───────────────────── */}
      {showWallet && selectedStudentInfo && (
        <WalletModal
          regNo={selectedStudentInfo.regNo}
          studentName={selectedStudentInfo.name}
          onClose={() => setShowWallet(false)}
          onChanged={async () => {
            try {
              const w = await getWallet(selectedStudentInfo.regNo);
              setWalletBalance(w.data.balance);
            } catch {}
          }}
        />
      )}
    </div>
  );
}

export default FeePayment;
