import { useState, useEffect, useMemo } from "react";
import { deactivateStudent, deactivateStudentPreview } from "../services/api";
import { toast } from "react-toastify";

const fmtRs   = (n) => `Rs.${Number(n ?? 0).toFixed(2)}`;
const todayIso = () => new Date().toISOString().split("T")[0];
const fmtDate = (d) => {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, "0")}-${dt.toLocaleString("en-US", { month: "short" })}-${dt.getFullYear()}`;
  } catch { return d; }
};

export default function DeactivateModal({ student, onClose, onDone }) {
  const [step, setStep] = useState(1);  // 1 = entry, 2 = preview, 3 = result

  // Step 1 form
  const [lastActiveDate, setLastActiveDate] = useState(todayIso());
  const [neverUsed, setNeverUsed]           = useState(false);
  const [feeHandling, setFeeHandling]       = useState("PRORATE");
  const [remarks, setRemarks]               = useState("");

  // Step 2 / preview
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview]       = useState(null);

  // Sub-choice for "still owes after pro-rate"
  const [balanceAction, setBalanceAction] = useState("COLLECT");
  const [collectMode, setCollectMode]     = useState("CASH");

  // Step 3 / saving
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const formValid = remarks.trim().length >= 3;

  // Step 1 → Step 2
  const handlePreview = async (e) => {
    e?.preventDefault?.();
    if (!formValid) { toast.error("Reason must be at least 3 characters"); return; }
    setPreviewing(true);
    try {
      const res = await deactivateStudentPreview({
        regNo: student.regNo,
        lastActiveDate: neverUsed ? null : lastActiveDate,
        neverUsed,
        feeHandling: neverUsed ? null : feeHandling,
        remarks,
      });
      setPreview(res.data);
      // Default sub-choice
      if (res.data.needsBalanceDecision) {
        setBalanceAction("COLLECT");
        setCollectMode("CASH");
      }
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || "Preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  // Step 2 → Confirm
  const handleConfirm = async () => {
    setSaving(true);
    try {
      const payload = {
        regNo: student.regNo,
        lastActiveDate: neverUsed ? null : lastActiveDate,
        neverUsed,
        feeHandling: neverUsed ? null : feeHandling,
        balanceAction: preview?.needsBalanceDecision ? balanceAction : null,
        collectMode:   (preview?.needsBalanceDecision && balanceAction === "COLLECT") ? collectMode : null,
        remarks,
      };
      const res = await deactivateStudent(payload);
      setResult(res.data);
      setStep(3);
      toast.success("Student deactivated");
      onDone && onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to deactivate");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} />
      <div className="modal fade show d-block" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header border-danger">
              <h5 className="modal-title text-danger fw-bold">
                🔴 Deactivate Student — {student.name} (#{student.regNo})
                <span className="badge bg-secondary ms-2">Step {step}/{step === 3 ? 3 : 2}</span>
              </h5>
              <button className="btn-close" onClick={onClose} disabled={saving || previewing} />
            </div>

            <div className="modal-body">

              {/* ════════════════ STEP 1 ════════════════ */}
              {step === 1 && (
                <form onSubmit={handlePreview}>
                  <div className="alert alert-warning py-2 small mb-3">
                    ⚠️ Deactivation will cancel seat bookings and update fee records. Use the options below to settle correctly.
                  </div>

                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        type="checkbox" className="form-check-input"
                        id="neverUsed" checked={neverUsed}
                        onChange={(e) => setNeverUsed(e.target.checked)}
                        disabled={previewing}
                      />
                      <label className="form-check-label" htmlFor="neverUsed">
                        <strong>Student never used the library</strong>
                        <div className="small text-muted">
                          Joined but never came. Current month fee record will be deleted (no fee owed).
                        </div>
                      </label>
                    </div>
                  </div>

                  {!neverUsed && (
                    <>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">
                          Last active date <span className="text-danger">*</span>
                        </label>
                        <input
                          type="date" className="form-control"
                          value={lastActiveDate}
                          max={todayIso()}
                          onChange={(e) => setLastActiveDate(e.target.value)}
                          disabled={previewing}
                        />
                        <small className="text-muted">When did the student last use the library? Defaults to today.</small>
                      </div>

                      <div className="mb-3">
                        <label className="form-label fw-semibold">
                          How to handle this month's fee? <span className="text-danger">*</span>
                        </label>
                        <div className="form-check">
                          <input type="radio" name="feeHandling" id="fhProrate"
                                 className="form-check-input" value="PRORATE"
                                 checked={feeHandling === "PRORATE"}
                                 onChange={(e) => setFeeHandling(e.target.value)}
                                 disabled={previewing} />
                          <label className="form-check-label" htmlFor="fhProrate">
                            <strong>Pro-rate to days used</strong>
                            <div className="small text-muted">Charge only for days the student actually used.</div>
                          </label>
                        </div>
                        <div className="form-check">
                          <input type="radio" name="feeHandling" id="fhWaive"
                                 className="form-check-input" value="WAIVE"
                                 checked={feeHandling === "WAIVE"}
                                 onChange={(e) => setFeeHandling(e.target.value)}
                                 disabled={previewing} />
                          <label className="form-check-label" htmlFor="fhWaive">
                            <strong>Waive remaining balance</strong>
                            <div className="small text-muted">Keep full fee on record, write off any unpaid balance.</div>
                          </label>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Reason <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control" rows={2}
                      placeholder="e.g., Moving to Mumbai for work, course completed, etc."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      disabled={previewing}
                    />
                  </div>

                  <div className="d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={previewing}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={previewing || !formValid}>
                      {previewing
                        ? <><span className="spinner-border spinner-border-sm me-2" />Loading preview...</>
                        : "Next: Preview →"}
                    </button>
                  </div>
                </form>
              )}

              {/* ════════════════ STEP 2 ════════════════ */}
              {step === 2 && preview && (
                <div>
                  {/* Student summary */}
                  <div className="card bg-light border mb-3">
                    <div className="card-body py-2 small">
                      <div><strong>{preview.studentName}</strong> (Reg #{preview.regNo})</div>
                      <div className="text-muted">
                        Joined: {fmtDate(preview.joiningDate)}
                        {!neverUsed && <> · Last active: {fmtDate(preview.lastActiveDate)} ({preview.daysUsed} of {preview.totalDaysInMonth} days)</>}
                      </div>
                    </div>
                  </div>

                  {/* Case: Never used */}
                  {preview.willDeleteRecord && (
                    <div className="alert alert-info">
                      🚫 <strong>Current month fee record will be DELETED</strong><br />
                      No service was rendered — no fee owed.
                    </div>
                  )}

                  {/* Case: No current month record exists */}
                  {!preview.hasCurrentMonthRecord && !preview.willDeleteRecord && (
                    <div className="alert alert-secondary">
                      ⓘ No current month fee record exists. Nothing to settle.
                    </div>
                  )}

                  {/* Case: Current month record - Pro-rate or Waive */}
                  {preview.hasCurrentMonthRecord && !preview.willDeleteRecord && (
                    <>
                      <h6 className="fw-bold mb-2">📊 Settlement Summary</h6>
                      <table className="table table-sm table-bordered mb-3">
                        <thead className="table-light">
                          <tr><th></th><th>Before</th><th>After</th></tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Final Fee</td>
                            <td>{fmtRs(preview.oldFinalFee)}</td>
                            <td><strong>{fmtRs(preview.newFinalFee)}</strong></td>
                          </tr>
                          <tr>
                            <td>Paid</td>
                            <td>{fmtRs(preview.oldPaid)}</td>
                            <td>{fmtRs(preview.oldPaid)}</td>
                          </tr>
                          <tr>
                            <td>Balance</td>
                            <td>{fmtRs(preview.oldBalance)}</td>
                            <td><strong>{fmtRs(preview.newBalance)}</strong></td>
                          </tr>
                          <tr>
                            <td>Status</td>
                            <td>{preview.oldStatus}</td>
                            <td><strong>{preview.newStatus}</strong></td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Wallet credit alert */}
                      {Number(preview.walletCreditWillAdd) > 0 && (
                        <div className="alert alert-warning">
                          💰 Student overpaid <strong>{fmtRs(preview.walletCreditWillAdd)}</strong> after pro-rate.<br />
                          This will be credited to wallet on confirm.
                        </div>
                      )}

                      {/* Still owes — sub-choice */}
                      {preview.needsBalanceDecision && (
                        <div className="alert alert-warning">
                          ⚠️ After pro-rate, student still owes <strong>{fmtRs(preview.balanceAfterProRate)}</strong>
                          <div className="mt-2">What now?</div>
                          <div className="form-check mt-1">
                            <input type="radio" name="balanceAction" id="baCollect"
                                   className="form-check-input" value="COLLECT"
                                   checked={balanceAction === "COLLECT"}
                                   onChange={(e) => setBalanceAction(e.target.value)} />
                            <label className="form-check-label" htmlFor="baCollect">
                              <strong>Collect {fmtRs(preview.balanceAfterProRate)} now</strong>
                              {balanceAction === "COLLECT" && (
                                <select className="form-select form-select-sm d-inline-block ms-2"
                                        style={{ width: "auto" }}
                                        value={collectMode}
                                        onChange={(e) => setCollectMode(e.target.value)}>
                                  <option value="CASH">💵 CASH</option>
                                  <option value="ONLINE">💳 ONLINE</option>
                                </select>
                              )}
                            </label>
                          </div>
                          <div className="form-check">
                            <input type="radio" name="balanceAction" id="baWaive"
                                   className="form-check-input" value="WAIVE"
                                   checked={balanceAction === "WAIVE"}
                                   onChange={(e) => setBalanceAction(e.target.value)} />
                            <label className="form-check-label" htmlFor="baWaive">
                              <strong>Waive {fmtRs(preview.balanceAfterProRate)}</strong> (forgive — can't collect)
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Settled cleanly */}
                      {!preview.needsBalanceDecision && Number(preview.walletCreditWillAdd) === 0 && (
                        <div className="alert alert-success small">
                          ✅ Settles cleanly — balance becomes Rs.0.
                        </div>
                      )}
                    </>
                  )}

                  {/* Actions checklist */}
                  <div className="card border mt-3">
                    <div className="card-body py-2 small">
                      <strong>Actions on Confirm:</strong>
                      <ul className="mb-0 mt-1 ps-3">
                        {preview.willDeleteRecord && <li>Delete current month fee record</li>}
                        {preview.hasCurrentMonthRecord && !preview.willDeleteRecord && <li>Update current month fee record (new final: {fmtRs(preview.newFinalFee)})</li>}
                        {preview.needsBalanceDecision && balanceAction === "COLLECT" && (
                          <li>Record payment of {fmtRs(preview.balanceAfterProRate)} ({collectMode})</li>
                        )}
                        {Number(preview.walletCreditWillAdd) > 0 && (
                          <li>Credit {fmtRs(preview.walletCreditWillAdd)} to student's wallet</li>
                        )}
                        {preview.seatToCancel != null && <li>Cancel seat booking (Seat {preview.seatToCancel})</li>}
                        {preview.futureRecordsCount > 0 && <li>Delete {preview.futureRecordsCount} future-month fee record(s)</li>}
                        <li>Set student as INACTIVE with last active date: {fmtDate(neverUsed ? null : lastActiveDate)}</li>
                      </ul>
                    </div>
                  </div>

                  <div className="d-flex justify-content-between mt-3">
                    <button className="btn btn-outline-secondary" onClick={() => setStep(1)} disabled={saving}>
                      ← Back
                    </button>
                    <div className="d-flex gap-2">
                      <button className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>
                        Cancel
                      </button>
                      <button className="btn btn-danger" onClick={handleConfirm} disabled={saving}>
                        {saving
                          ? <><span className="spinner-border spinner-border-sm me-2" />Deactivating...</>
                          : "✓ Confirm Deactivate"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ════════════════ STEP 3 ════════════════ */}
              {step === 3 && result && (
                <div>
                  <div className="alert alert-success">
                    <strong>{result.message}</strong>
                  </div>
                  <div className="card border">
                    <div className="card-body small">
                      <strong>Summary:</strong>
                      <ul className="mb-0 mt-1 ps-3">
                        {result.currentMonthDeleted && <li>Current month fee record DELETED</li>}
                        {!result.currentMonthDeleted && Number(result.newFinalFee) > 0 && (
                          <li>Current month fee: {fmtRs(result.oldFinalFee)} → <strong>{fmtRs(result.newFinalFee)}</strong></li>
                        )}
                        {Number(result.amountCollected) > 0 && (
                          <li>Payment collected: <strong>{fmtRs(result.amountCollected)}</strong>
                            {result.receiptNumber && <> · Receipt: <code>{result.receiptNumber}</code></>}
                          </li>
                        )}
                        {Number(result.amountWaived) > 0 && (
                          <li>Waived: <strong>{fmtRs(result.amountWaived)}</strong></li>
                        )}
                        {Number(result.walletCreditAdded) > 0 && (
                          <li>Wallet credit added: <strong>{fmtRs(result.walletCreditAdded)}</strong></li>
                        )}
                        {result.bookingsCancelled > 0 && (
                          <li>Seat bookings cancelled: {result.bookingsCancelled}</li>
                        )}
                        {result.futureRecordsDeleted > 0 && (
                          <li>Future-month fee records deleted: {result.futureRecordsDeleted}</li>
                        )}
                        <li>Status: ACTIVE → INACTIVE</li>
                        <li>Last active date: {result.lastActiveDate}</li>
                        <li>Deactivation date: {result.deactivationDate}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose}>Close</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
