import { useState, useMemo } from "react";
import { reviseFee, reviseFeePreview } from "../services/api";
import { toast } from "react-toastify";

const fmtRs = (n) => `Rs.${Number(n ?? 0).toFixed(2)}`;

// Reason category options
const REASON_OPTIONS = [
  { value: "Discount correction",       icon: "📝" },
  { value: "Admission fee correction",  icon: "💰" },
  { value: "Other",                     icon: "✏️" },
];

export default function ReviseFeeModal({ feeRecord, onClose, onSaved }) {
  // ── Step state ──
  const [step, setStep] = useState(1);   // 1=edit, 2=preview, 3=result

  // ── Derive initial monthly discount from stored prorated value ──
  const computeFullMonthDiscount = () => {
    const stored = Number(feeRecord.discountAmount) || 0;
    const total = Number(feeRecord.totalDaysInMonth);
    const applicable = Number(feeRecord.applicableDays);
    if (!total || !applicable || total === applicable) {
      return stored.toFixed(2);
    }
    return ((stored * total) / applicable).toFixed(2);
  };

  const initialDiscount  = computeFullMonthDiscount();
  const initialAdmission = (Number(feeRecord.admissionFee) || 0).toFixed(2);

  // ── Step 1 form state ──
  const [discount, setDiscount]   = useState(initialDiscount);
  const [admission, setAdmission] = useState(initialAdmission);
  const [reasonCategory, setReasonCategory] = useState("");
  const [reasonDetails, setReasonDetails]   = useState("");

  // ── Step 2 / 3 state ──
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview]       = useState(null);
  const [saving, setSaving]         = useState(false);
  const [result, setResult]         = useState(null);

  // ── Derived: is mid-month record? ──
  const totalDays      = Number(feeRecord.totalDaysInMonth) || 0;
  const applicableDays = Number(feeRecord.applicableDays)   || 0;
  const isMidMonth = totalDays > 0 && applicableDays > 0 && totalDays !== applicableDays;

  // ── Live calculations as user types in Step 1 ──
  const liveProratedDiscount = useMemo(() => {
    const monthly = Number(discount) || 0;
    if (!isMidMonth) return null;
    return ((monthly * applicableDays) / totalDays).toFixed(2);
  }, [discount, isMidMonth, applicableDays, totalDays]);

  const oldProratedDiscount = useMemo(() => {
    return (Number(feeRecord.discountAmount) || 0).toFixed(2);
  }, [feeRecord.discountAmount]);

  const liveNewFinalFee = useMemo(() => {
    const monthlyFee = Number(feeRecord.monthlyFee) || 0;
    const monthlyDisc = Number(discount) || 0;
    const adm = Number(admission) || 0;
    if (totalDays === 0 || applicableDays === 0) return null;
    const perDayFee  = monthlyFee / totalDays;
    const perDayDisc = monthlyDisc / totalDays;
    const proFee  = perDayFee * applicableDays;
    const proDisc = perDayDisc * applicableDays;
    return Math.max(0, proFee - proDisc + adm).toFixed(2);
  }, [discount, admission, feeRecord.monthlyFee, totalDays, applicableDays]);

  const liveNewBalance = useMemo(() => {
    const paid = Number(feeRecord.paidAmount) || 0;
    const finalFee = Number(liveNewFinalFee) || 0;
    return Math.max(0, finalFee - paid).toFixed(2);
  }, [liveNewFinalFee, feeRecord.paidAmount]);

  // ── Form validation ──
  const detailsTrimmed = reasonDetails.trim();
  const detailsLength  = detailsTrimmed.length;
  const formValid =
    discount !== "" && admission !== "" &&
    reasonCategory !== "" && detailsLength >= 10 &&
    Number(discount) >= 0 && Number(admission) >= 0;

  const combinedReason = reasonCategory && detailsTrimmed
    ? `${reasonCategory}: ${detailsTrimmed}`
    : "";

  // ── Step 1 → Step 2: Fetch preview ──
  const handlePreview = async (e) => {
    e.preventDefault();
    if (!formValid) {
      toast.error("Fill all required fields (details must be at least 10 characters)");
      return;
    }
    setPreviewing(true);
    try {
      const res = await reviseFeePreview(feeRecord.feeId, {
        newDiscount:     discount  === "" ? null : parseFloat(discount),
        newAdmissionFee: admission === "" ? null : parseFloat(admission),
        reason:    combinedReason,
        adminUser: "admin",
      });
      setPreview(res.data);
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || "Preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  // ── Step 2 → Confirm: Execute the revision ──
  const handleConfirm = async () => {
    setSaving(true);
    try {
      const res = await reviseFee(feeRecord.feeId, {
        newDiscount:     discount  === "" ? null : parseFloat(discount),
        newAdmissionFee: admission === "" ? null : parseFloat(admission),
        reason:    combinedReason,
        adminUser: "admin",
      });
      setResult(res.data);
      setStep(3);
      toast.success("Fee revised successfully");

      if (res.data.walletCreditAdded && Number(res.data.walletCreditAdded) > 0) {
        toast.info(
          `💰 Student overpaid Rs.${res.data.walletCreditAdded} — credited to wallet.`,
          { autoClose: 6000 }
        );
      }

      onSaved && onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to revise fee");
    } finally {
      setSaving(false);
    }
  };

  // ── Delta indicator helper ──
  const renderDelta = (oldVal, newVal) => {
    const oldNum = Number(oldVal) || 0;
    const newNum = Number(newVal) || 0;
    const diff = newNum - oldNum;
    if (Math.abs(diff) < 0.01) return <span className="text-muted">—</span>;
    if (diff > 0)  return <span className="text-danger fw-bold">⬆ +{diff.toFixed(2)}</span>;
    return <span className="text-success fw-bold">⬇ {diff.toFixed(2)}</span>;
  };

  // ── Impact summary box variant ──
  const impactBox = () => {
    if (!preview) return null;
    const oldBal = Number(preview.oldBalance) || 0;
    const newBal = Number(preview.newBalance) || 0;
    const walletCredit = Number(preview.walletCreditAdded) || 0;
    const diff = newBal - oldBal;

    if (walletCredit > 0) {
      return (
        <div className="alert alert-warning">
          💰 <strong>Student has overpaid by Rs.{walletCredit.toFixed(2)} after this revision.</strong><br/>
          Rs.{walletCredit.toFixed(2)} will be credited to student's wallet on save.
        </div>
      );
    }
    if (Math.abs(diff) < 0.01) {
      return (
        <div className="alert alert-secondary">
          ⓘ No change in balance. Only future months affected.
        </div>
      );
    }
    if (diff < 0) {
      return (
        <div className="alert alert-success">
          ✅ <strong>Student will owe Rs.{Math.abs(diff).toFixed(2)} LESS than before.</strong><br/>
          Balance reduced from Rs.{oldBal.toFixed(2)} → Rs.{newBal.toFixed(2)}
        </div>
      );
    }
    return (
      <div className="alert alert-warning">
        ⚠️ <strong>Student will owe Rs.{diff.toFixed(2)} MORE than before.</strong><br/>
        Balance increased from Rs.{oldBal.toFixed(2)} → Rs.{newBal.toFixed(2)}.
        Collect Rs.{diff.toFixed(2)} extra when student next visits.
      </div>
    );
  };

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} />
      <div className="modal fade show d-block" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title fw-bold">
                ✏️ Revise Fee — {feeRecord.feeMonth}/{feeRecord.feeYear}
                <span className="badge bg-secondary ms-2">Step {step}/{step === 3 ? 3 : 2}</span>
              </h5>
              <button className="btn-close" onClick={onClose} disabled={saving || previewing} />
            </div>

            <div className="modal-body">

              {/* ════════════════════════════════════════════
                  STEP 1 — Edit form
                  ════════════════════════════════════════════ */}
              {step === 1 && (
                <form onSubmit={handlePreview}>
                  <div className="alert alert-primary py-2 small mb-3">
                    💡 <strong>Existing discount and admission fee are pre-filled below.</strong>{" "}
                    Edit only the value you want to change.
                  </div>

                  {isMidMonth && (
                    <div className="alert alert-info py-2 small mb-3">
                      ℹ️ Mid-month joining record ({applicableDays} of {totalDays} days).
                      Discount shown is the <strong>monthly amount</strong> — system pro-rates automatically.
                    </div>
                  )}

                  {/* Current record summary */}
                  <div className="card bg-light border mb-3">
                    <div className="card-body py-2">
                      <div className="small fw-bold mb-1">Current Record</div>
                      <div className="small text-muted">
                        Monthly Fee: <strong>{fmtRs(feeRecord.monthlyFee)}</strong> · Admission: <strong>{fmtRs(feeRecord.admissionFee)}</strong> · Discount: <strong>Rs.{oldProratedDiscount}</strong> (stored, pro-rated)
                      </div>
                      <div className="small text-muted">
                        Final: <strong>{fmtRs(feeRecord.finalFee)}</strong> · Paid: <strong>{fmtRs(feeRecord.paidAmount)}</strong> · Balance: <strong>{fmtRs(feeRecord.balanceAmount)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Monthly Discount (Rs)
                      <span className="text-muted fw-normal small"> — pro-rated automatically</span>
                    </label>
                    <input
                      type="number" className="form-control" step="0.01" min="0"
                      value={discount} onChange={(e) => setDiscount(e.target.value)}
                      disabled={previewing}
                    />
                    <small className="text-muted d-block">
                      Pre-filled from current record: Rs.{initialDiscount}/month
                    </small>
                    {isMidMonth && liveProratedDiscount !== null && (
                      <small className="text-info d-block">
                        This month pro-rated: <strong>Rs.{liveProratedDiscount}</strong>{" "}
                        (was Rs.{oldProratedDiscount})
                      </small>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Admission Fee (Rs)
                      <span className="text-muted fw-normal small"> — one-time</span>
                    </label>
                    <input
                      type="number" className="form-control" step="0.01" min="0"
                      value={admission} onChange={(e) => setAdmission(e.target.value)}
                      disabled={previewing}
                    />
                    <small className="text-muted">
                      Pre-filled from current record: Rs.{initialAdmission}
                    </small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Reason for revision <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={reasonCategory}
                      onChange={(e) => setReasonCategory(e.target.value)}
                      disabled={previewing}
                      required
                    >
                      <option value="">Select a reason category...</option>
                      {REASON_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.icon} {opt.value}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Additional details <span className="text-danger">*</span>
                      <span className="text-muted fw-normal small"> (min 10 characters)</span>
                    </label>
                    <textarea
                      className="form-control" rows={2}
                      placeholder="e.g., Student claimed discount on admission day but it was not entered correctly."
                      value={reasonDetails}
                      onChange={(e) => setReasonDetails(e.target.value)}
                      disabled={previewing}
                    />
                    <small className={detailsLength >= 10 ? "text-success" : "text-muted"}>
                      {detailsLength} / 10 minimum characters
                    </small>
                  </div>

                  {/* Live preview box */}
                  <div className="alert alert-info py-2 mb-0">
                    <div className="fw-bold small mb-1">📊 Live Preview (estimated)</div>
                    <div className="small">
                      New Final Fee: <strong>Rs.{liveNewFinalFee}</strong> &nbsp;·&nbsp;
                      New Balance: <strong>Rs.{liveNewBalance}</strong>
                    </div>
                    <div className="small text-muted">
                      Click "Next" to see exact calculation and full impact.
                    </div>
                  </div>

                  <div className="d-flex justify-content-end gap-2 mt-3">
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

              {/* ════════════════════════════════════════════
                  STEP 2 — Preview impact
                  ════════════════════════════════════════════ */}
              {step === 2 && preview && (
                <div>
                  <h6 className="fw-bold mb-2">📊 Revision Impact (this month)</h6>

                  <table className="table table-sm table-bordered">
                    <thead className="table-light">
                      <tr>
                        <th></th>
                        <th>Before</th>
                        <th>After</th>
                        <th>Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Monthly Discount</td>
                        <td>{fmtRs(preview.oldMonthlyDiscount)}</td>
                        <td>{fmtRs(preview.newMonthlyDiscount)}</td>
                        <td>{renderDelta(preview.oldMonthlyDiscount, preview.newMonthlyDiscount)}</td>
                      </tr>
                      {preview.isMidMonth && (
                        <tr className="small text-muted">
                          <td className="ps-3">↳ pro-rated this month</td>
                          <td>{fmtRs(preview.oldProratedDiscount)}</td>
                          <td>{fmtRs(preview.newProratedDiscount)}</td>
                          <td>{renderDelta(preview.oldProratedDiscount, preview.newProratedDiscount)}</td>
                        </tr>
                      )}
                      <tr>
                        <td>Admission Fee</td>
                        <td>{fmtRs(preview.oldAdmissionFee)}</td>
                        <td>{fmtRs(preview.newAdmissionFee)}</td>
                        <td>{renderDelta(preview.oldAdmissionFee, preview.newAdmissionFee)}</td>
                      </tr>
                      <tr className="table-info">
                        <td><strong>Final Fee (this month)</strong></td>
                        <td><strong>{fmtRs(preview.oldFinalFee)}</strong></td>
                        <td><strong>{fmtRs(preview.newFinalFee)}</strong></td>
                        <td>{renderDelta(preview.oldFinalFee, preview.newFinalFee)}</td>
                      </tr>
                      <tr>
                        <td>Already Paid</td>
                        <td colSpan={2}>{fmtRs(feeRecord.paidAmount)}</td>
                        <td>—</td>
                      </tr>
                      <tr>
                        <td><strong>Balance to Collect</strong></td>
                        <td><strong>{fmtRs(preview.oldBalance)}</strong></td>
                        <td><strong>{fmtRs(preview.newBalance)}</strong></td>
                        <td>{renderDelta(preview.oldBalance, preview.newBalance)}</td>
                      </tr>
                      <tr>
                        <td>Status</td>
                        <td colSpan={3}>
                          {preview.oldStatus} → <strong>{preview.newStatus}</strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Impact summary box */}
                  {impactBox()}

                  {/* Next-month preview */}
                  <div className="alert alert-info mt-3">
                    <h6 className="fw-bold mb-2">📅 From next month onwards</h6>
                    <table className="table table-sm table-borderless mb-0">
                      <tbody>
                        <tr>
                          <td className="text-muted" style={{ width: "45%" }}>Monthly fee</td>
                          <td>{fmtRs(preview.monthlyFee)}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Monthly discount</td>
                          <td>
                            {fmtRs(preview.newMonthlyDiscount)}{" "}
                            <small className="text-muted">(was {fmtRs(preview.oldMonthlyDiscount)})</small>
                          </td>
                        </tr>
                        <tr className="border-top">
                          <td className="fw-bold">Bill from next month</td>
                          <td className="fw-bold text-primary fs-5">{fmtRs(preview.nextMonthFee)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Reason recap */}
                  <div className="card border mt-3">
                    <div className="card-body py-2">
                      <div className="small fw-bold mb-1">📝 Reason Recorded</div>
                      <div className="small">
                        <strong>Category:</strong>{" "}
                        {REASON_OPTIONS.find(o => o.value === reasonCategory)?.icon} {reasonCategory}
                      </div>
                      <div className="small">
                        <strong>Details:</strong> {reasonDetails}
                      </div>
                    </div>
                  </div>

                  <div className="d-flex justify-content-between mt-4">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setStep(1)} disabled={saving}>
                      ← Back to Edit
                    </button>
                    <div className="d-flex gap-2">
                      <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>
                        Cancel
                      </button>
                      <button type="button" className="btn btn-success" onClick={handleConfirm} disabled={saving}>
                        {saving
                          ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</>
                          : "✓ Confirm Save"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════
                  STEP 3 — Result (success page)
                  ════════════════════════════════════════════ */}
              {step === 3 && result && (
                <div>
                  <div className={`alert ${Number(result.walletCreditAdded) > 0 ? "alert-warning" : "alert-success"}`}>
                    <strong>{result.message}</strong>
                  </div>

                  <table className="table table-sm table-bordered">
                    <tbody>
                      <tr><td>Old Final Fee</td><td>Rs.{result.oldFinalFee}</td></tr>
                      <tr><td>New Final Fee</td><td>Rs.{result.newFinalFee}</td></tr>
                      <tr><td>Old Balance</td><td>Rs.{result.oldBalance}</td></tr>
                      <tr><td>New Balance</td><td>Rs.{result.newBalance}</td></tr>
                      <tr>
                        <td>Status</td>
                        <td>{result.oldStatus} → <strong>{result.newStatus}</strong></td>
                      </tr>
                      {Number(result.walletCreditAdded) > 0 && (
                        <tr className="table-warning">
                          <td>Wallet Credit</td>
                          <td>Rs.{result.walletCreditAdded}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {result.nextMonthFee != null && (
                    <div className="alert alert-info mt-3">
                      <h6 className="fw-bold mb-2">📅 From next month onwards</h6>
                      <table className="table table-sm table-borderless mb-0">
                        <tbody>
                          <tr>
                            <td className="text-muted" style={{ width: "45%" }}>Monthly fee</td>
                            <td>Rs.{result.monthlyFee}</td>
                          </tr>
                          <tr>
                            <td className="text-muted">Monthly discount</td>
                            <td>Rs.{result.newMonthlyDiscount}</td>
                          </tr>
                          <tr className="border-top">
                            <td className="fw-bold">Bill from next month</td>
                            <td className="fw-bold text-primary fs-5">Rs.{result.nextMonthFee}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {result.overpaidNote && (
                    <div className="alert alert-warning small">{result.overpaidNote}</div>
                  )}
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
