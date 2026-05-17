import { useState, useMemo } from "react";
import { getAllFeeStatus, bulkPayment } from "../services/api";
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

function BulkPayment() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [paymentMode, setPaymentMode] = useState("CASH");

  const [students, setStudents] = useState([]); // [{regNo, studentName, timeSlot, balanceAmount, paymentStatus, ...}]
  const [amounts, setAmounts] = useState({}); // { [regNo]: "amount string" }
  const [selected, setSelected] = useState({}); // { [regNo]: bool }

  const [fetchLoading, setFetchLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [result, setResult] = useState(null);

  // ── Fetch students with fee records for chosen month/year ──────────────────
  const handleFetch = async (e) => {
    e.preventDefault();
    setFetchLoading(true);
    setStudents([]);
    setAmounts({});
    setSelected({});
    setResult(null);
    try {
      const res = await getAllFeeStatus({ month, year });
      // keep only students who have a fee record AND are not already fully PAID
      const eligible = (res.data.students || []).filter(
        (s) =>
          s.paymentStatus &&
          s.paymentStatus !== "NO_RECORD" &&
          s.paymentStatus !== "PAID",
      );
      if (eligible.length === 0) {
        toast.info("No pending / partial fee records found for this month.");
      }
      setStudents(eligible);

      // Pre-fill amounts with each student's full balance
      const initAmounts = {};
      const initSelected = {};
      eligible.forEach((s) => {
        initAmounts[s.regNo] =
          s.balanceAmount != null ? String(s.balanceAmount) : "";
        initSelected[s.regNo] = true;
      });
      setAmounts(initAmounts);
      setSelected(initSelected);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch fee records");
    } finally {
      setFetchLoading(false);
    }
  };

  // ── Toggle select all ──────────────────────────────────────────────────────
  const allChecked =
    students.length > 0 && students.every((s) => selected[s.regNo]);
  const handleSelectAll = (e) => {
    const val = e.target.checked;
    const next = {};
    students.forEach((s) => (next[s.regNo] = val));
    setSelected(next);
  };

  // ── Summary of selected rows ───────────────────────────────────────────────
  const summary = useMemo(() => {
    let count = 0;
    let total = 0;
    students.forEach((s) => {
      if (selected[s.regNo]) {
        count++;
        const v = parseFloat(amounts[s.regNo]);
        if (!isNaN(v) && v > 0) total += v;
      }
    });
    return { count, total };
  }, [students, selected, amounts]);

  // ── Submit bulk payment ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const payments = students
      .filter((s) => selected[s.regNo])
      .map((s) => ({
        regNo: s.regNo,
        amount: parseFloat(amounts[s.regNo]),
      }))
      .filter((p) => !isNaN(p.amount) && p.amount > 0);

    if (payments.length === 0) {
      toast.error("Select at least one student with a valid amount.");
      return;
    }

    // Client-side over-payment guard
    for (const p of payments) {
      const student = students.find((s) => s.regNo === p.regNo);
      if (student && p.amount > Number(student.balanceAmount)) {
        toast.error(
          `Amount ₹${p.amount} exceeds balance ₹${student.balanceAmount} for ${student.studentName} (Reg: ${p.regNo})`,
        );
        return;
      }
    }

    setSubmitLoading(true);
    setResult(null);
    try {
      const res = await bulkPayment({
        feeMonth: Number(month),
        feeYear: Number(year),
        paymentMode,
        payments,
      });
      setResult(res.data);
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || "Bulk payment failed");
    } finally {
      setSubmitLoading(false);
    }
  };

  const statusBadge = (s) => {
    if (s === "PAID") return <span className="badge bg-success">✅ PAID</span>;
    if (s === "PARTIAL")
      return <span className="badge bg-warning text-dark">🔶 PARTIAL</span>;
    return <span className="badge bg-secondary">⏳ PENDING</span>;
  };

  return (
    <div>
      <h2 className="page-title">💼 Bulk Payment</h2>
      <p className="text-muted mb-4">
        Collect fees from multiple students in a single transaction. All
        payments are atomic — if any entry fails, nothing is saved.
      </p>

      {/* ── Step 1: Choose month/year ──────────────────────────────────────── */}
      <div className="form-section col-lg-7 mb-4">
        <h5 className="fw-bold mb-3">
          Step 1: Select Month &amp; Payment Mode
        </h5>
        <form onSubmit={handleFetch} className="row g-3 align-items-end">
          <div className="col-md-4">
            <label className="form-label fw-bold">Month</label>
            <select
              className="form-select"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {MONTH_NAMES.map((m, i) => (
                <option key={i} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label fw-bold">Year</label>
            <input
              type="number"
              className="form-control"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label fw-bold">Payment Mode</label>
            <select
              className="form-select"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
            >
              <option value="CASH">💵 Cash</option>
              <option value="ONLINE">💳 Online</option>
            </select>
          </div>
          <div className="col-md-2">
            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={fetchLoading}
            >
              {fetchLoading ? "Loading..." : "🔍 Load"}
            </button>
          </div>
        </form>
      </div>

      {/* ── Step 2: Student table with editable amounts ────────────────────── */}
      {students.length > 0 && (
        <div className="form-section mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <h5 className="fw-bold mb-0">
              Step 2: Enter Amounts —{" "}
              <span className="text-muted fw-normal">
                {MONTH_NAMES[month - 1]} {year} &nbsp;|&nbsp; {students.length}{" "}
                student(s)
              </span>
            </h5>
            <span className="badge bg-dark fs-6 px-3 py-2">
              Selected: {summary.count} &nbsp;|&nbsp; Total: ₹
              {summary.total.toFixed(2)}
            </span>
          </div>

          <div className="table-responsive">
            <table className="table table-custom table-hover align-middle">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={allChecked}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>#</th>
                  <th>Reg No</th>
                  <th>Name</th>
                  <th>Slot</th>
                  <th>Total Fee</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Pay Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr
                    key={s.regNo}
                    className={
                      !selected[s.regNo] ? "text-muted opacity-50" : ""
                    }
                  >
                    <td>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={!!selected[s.regNo]}
                        onChange={(e) =>
                          setSelected({
                            ...selected,
                            [s.regNo]: e.target.checked,
                          })
                        }
                      />
                    </td>
                    <td>{i + 1}</td>
                    <td className="fw-bold">{s.regNo}</td>
                    <td>{s.studentName}</td>
                    <td>
                      <small>{s.timeSlot || "—"}</small>
                    </td>
                    <td>₹{s.finalFee}</td>
                    <td>₹{s.paidAmount}</td>
                    <td
                      className={
                        Number(s.balanceAmount) > 0
                          ? "fw-bold text-danger"
                          : "text-success"
                      }
                    >
                      ₹{s.balanceAmount}
                    </td>
                    <td>{statusBadge(s.paymentStatus)}</td>
                    <td style={{ minWidth: "130px" }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={s.balanceAmount}
                        className="form-control form-control-sm"
                        value={amounts[s.regNo] ?? ""}
                        disabled={!selected[s.regNo]}
                        onChange={(e) =>
                          setAmounts({ ...amounts, [s.regNo]: e.target.value })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Submit bar */}
          <div className="d-flex align-items-center gap-3 mt-3 flex-wrap">
            <button
              className="btn btn-success px-5"
              onClick={handleSubmit}
              disabled={submitLoading || summary.count === 0}
            >
              {submitLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Processing...
                </>
              ) : (
                `💰 Collect Payment — ${summary.count} Student(s) · ₹${summary.total.toFixed(2)}`
              )}
            </button>
            <small className="text-muted">
              ⚠️ All entries are saved together. Any invalid entry rolls back
              the entire batch.
            </small>
          </div>
        </div>
      )}

      {/* ── Step 3: Result ────────────────────────────────────────────────── */}
      {result && (
        <div className="form-section mb-4">
          <div className="alert alert-success mb-3">
            <h5 className="fw-bold mb-1">✅ {result.message}</h5>
            <div className="d-flex gap-4 flex-wrap mt-2">
              <span>
                📅 Date: <strong>{result.paymentDate}</strong>
              </span>
              <span>
                💳 Mode: <strong>{result.paymentMode}</strong>
              </span>
              <span>
                👥 Students: <strong>{result.totalStudents}</strong>
              </span>
              <span>
                💰 Total Collected:{" "}
                <strong className="text-success">
                  ₹{result.totalAmountCollected}
                </strong>
              </span>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-sm table-custom table-hover">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Reg No</th>
                  <th>Name</th>
                  <th>Paid Now</th>
                  <th>Balance Left</th>
                  <th>Status</th>
                  <th>Receipt No</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((r, i) => (
                  <tr key={r.regNo}>
                    <td>{i + 1}</td>
                    <td className="fw-bold">{r.regNo}</td>
                    <td>{r.studentName}</td>
                    <td className="text-success fw-bold">₹{r.amountPaid}</td>
                    <td
                      className={
                        Number(r.balanceRemaining) > 0
                          ? "text-danger fw-bold"
                          : "text-success"
                      }
                    >
                      ₹{r.balanceRemaining}
                    </td>
                    <td>{statusBadge(r.paymentStatus)}</td>
                    <td className="text-muted small">{r.receiptNumber}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            className="btn btn-outline-secondary btn-sm mt-2"
            onClick={() => setResult(null)}
          >
            Clear Results
          </button>
        </div>
      )}
    </div>
  );
}

export default BulkPayment;
