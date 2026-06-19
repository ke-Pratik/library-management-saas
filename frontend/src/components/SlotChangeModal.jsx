import { useState, useEffect, useMemo } from "react";
import { slotChange, slotChangePreview, getActiveConfig, getMyProfile } from "../services/api";
import { toast } from "react-toastify";

export default function SlotChangeModal({ student, onClose, onSaved }) {
  // ── Step state ──
  const [step, setStep] = useState(1);             // 1=entry, 2=preview, 3=result

  // ── Step 1 form ──
  const [inTime, setInTime]     = useState("");
  const [outTime, setOutTime]   = useState("");
  const [discount, setDiscount] = useState("0");
  const [reason, setReason]     = useState("");

  // ── Loaded data ──
  const [currentConfig, setCurrentConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);

  // ── Step 2 preview ──
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview]       = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);   // null=keep current, or seatNo
  const [showAllSeats, setShowAllSeats] = useState(false);

  // ── Step 3 result ──
  const [saving, setSaving]   = useState(false);
  const [result, setResult]   = useState(null);

  // ── Operating hours (for live warning) ──
  // Note: TenantSettings has operatingHoursStart/End. We fetch via /api/me/profile? — not available.
  // For now, use simple inTime < outTime check + fall back to backend for full validation.
  // Hardcoded reasonable defaults (most libraries operate 06:00-22:00); the backend is the source of truth.
  const [opHours] = useState({ start: "06:00", end: "22:00" });

  // ── Pre-fill from active fee config ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getActiveConfig(student.regNo);
        if (cancelled) return;
        setCurrentConfig(res.data);
        const cfgDisc = res.data.discountAmount != null
          ? Number(res.data.discountAmount).toFixed(2)
          : "0";
        setDiscount(cfgDisc);
      } catch (err) {
        if (!cancelled) {
          toast.info("No existing fee config found. Discount defaulted to 0.");
        }
      } finally {
        if (!cancelled) setConfigLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [student.regNo]);

  // ── Live operating-hours warning ──
  const operatingWarning = useMemo(() => {
    if (!inTime || !outTime) return null;
    if (inTime >= outTime) return "In Time must be before Out Time";
    if (inTime < opHours.start || outTime > opHours.end) {
      return `Outside operating hours (${opHours.start} – ${opHours.end})`;
    }
    return null;
  }, [inTime, outTime, opHours]);

  // ── Step 1 → Step 2: Fetch preview ──
  const handlePreview = async (e) => {
    e.preventDefault();
    if (!inTime || !outTime || !reason.trim()) {
      toast.error("Fill all required fields");
      return;
    }
    if (reason.trim().length < 10) {
      toast.error("Reason must be at least 10 characters");
      return;
    }
    setPreviewing(true);
    try {
      const res = await slotChangePreview({
        regNo: student.regNo,
        newInTime: inTime,
        newOutTime: outTime,
        newDiscount: discount === "" ? 0 : parseFloat(discount),
        reason,
        adminUser: "admin",
      });
      setPreview(res.data);
      // Default selection: current seat if available, else first available
      if (res.data.currentSeatAvailableInNewSlot) {
        setSelectedSeat(res.data.currentSeatNo);
      } else if (res.data.availableSeatsInNewSlot?.length > 0) {
        setSelectedSeat(res.data.availableSeatsInNewSlot[0]);
      } else {
        setSelectedSeat(null);
      }
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || "Preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  // ── Step 2 → Confirm: Execute the slot change ──
  const handleConfirm = async () => {
    if (selectedSeat == null) {
      const proceed = window.confirm(
        "No seat selected. Slot will be changed without a seat assignment. Continue?",
      );
      if (!proceed) return;
    }
    setSaving(true);
    try {
      const res = await slotChange({
        regNo: student.regNo,
        newInTime: inTime,
        newOutTime: outTime,
        newDiscount: discount === "" ? 0 : parseFloat(discount),
        reason,
        adminUser: "admin",
        targetSeatNo: selectedSeat,
      });
      setResult(res.data);
      setStep(3);
      toast.success("Slot changed successfully");
      if (res.data.walletCreditAdded && Number(res.data.walletCreditAdded) > 0) {
        toast.info(
          `💰 Student overpaid Rs.${res.data.walletCreditAdded} — credited to wallet.`,
          { autoClose: 6000 },
        );
      }
      onSaved && onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change slot");
    } finally {
      setSaving(false);
    }
  };

  // Helpers
  const fmtRs = (n) => `Rs.${Number(n ?? 0).toFixed(2)}`;
  const perDayOld = preview && preview.oldDays > 0
    ? (Number(preview.oldUsedFee) / preview.oldDays).toFixed(2)
    : "0.00";
  const perDayNew = preview && preview.newDays > 0
    ? (Number(preview.newRemainingFee) / preview.newDays).toFixed(2)
    : "0.00";

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} />
      <div className="modal fade show d-block" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title fw-bold">
                🕐 Change Slot — {student.name} (#{student.regNo})
                <span className="badge bg-secondary ms-2">Step {step}/{step === 3 ? 3 : 2}</span>
              </h5>
              <button className="btn-close" onClick={onClose} disabled={saving || previewing} />
            </div>

            <div className="modal-body">
              {configLoading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status" />
                  <p className="mt-2 text-muted">Loading current config...</p>
                </div>
              ) : step === 1 ? (
                // ═══════════════════════════════════════════
                // STEP 1 — Entry form
                // ═══════════════════════════════════════════
                <form onSubmit={handlePreview}>
                  <div className="alert alert-primary py-2 small mb-3">
                    💡 <strong>Current discount is pre-filled below.</strong> Edit only if you want to change it.
                  </div>

                  {currentConfig && (
                    <div className="alert alert-info py-2 small mb-3">
                      <strong>Current plan:</strong>{" "}
                      {currentConfig.inTime} – {currentConfig.outTime} | Monthly fee Rs.
                      {currentConfig.monthlyFee} | Discount Rs.{Number(currentConfig.discountAmount || 0).toFixed(2)}
                    </div>
                  )}

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        New In Time <span className="text-danger">*</span>
                      </label>
                      <input
                        type="time" className="form-control" required
                        value={inTime} onChange={(e) => setInTime(e.target.value)}
                        disabled={previewing}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        New Out Time <span className="text-danger">*</span>
                      </label>
                      <input
                        type="time" className="form-control" required
                        value={outTime} onChange={(e) => setOutTime(e.target.value)}
                        disabled={previewing}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Monthly Discount (Rs)
                        <span className="text-muted fw-normal small"> — pro-rated automatically</span>
                      </label>
                      <input
                        type="number" className="form-control" step="0.01" min="0"
                        value={discount} onChange={(e) => setDiscount(e.target.value)}
                        disabled={previewing}
                      />
                      <small className="text-muted">
                        Pre-filled from current plan: Rs.
                        {Number(currentConfig?.discountAmount || 0).toFixed(2)}/month
                      </small>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">
                        Reason <span className="text-danger">*</span>{" "}
                        <span className="text-muted fw-normal small">(min 10 characters)</span>
                      </label>
                      <textarea
                        className="form-control" required rows={2} minLength={10}
                        value={reason} onChange={(e) => setReason(e.target.value)}
                        disabled={previewing}
                      />
                    </div>
                  </div>

                  {operatingWarning && (
                    <div className="alert alert-warning py-2 mt-3 mb-0 small">
                      ⚠️ {operatingWarning}
                    </div>
                  )}
                  <div className="alert alert-secondary py-2 mt-2 mb-0 small">
                    ⓘ Slot will take effect from today.
                  </div>

                  <div className="d-flex justify-content-end gap-2 mt-3">
                    <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={previewing}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={previewing}>
                      {previewing
                        ? <><span className="spinner-border spinner-border-sm me-2" />Loading preview...</>
                        : "Preview →"}
                    </button>
                  </div>
                </form>
              ) : step === 2 && preview ? (
                // ═══════════════════════════════════════════
                // STEP 2 — Preview + seat picker
                // ═══════════════════════════════════════════
                <div>
                  <h6 className="fw-bold mb-2">📊 Fee Impact (this month)</h6>
                  <table className="table table-sm table-bordered">
                    <tbody>
                      <tr>
                        <td>Old slot used</td>
                        <td>{preview.oldDays} days × Rs.{perDayOld}/day = {fmtRs(preview.oldUsedFee)}</td>
                      </tr>
                      <tr>
                        <td>New slot used</td>
                        <td>{preview.newDays} days × Rs.{perDayNew}/day = {fmtRs(preview.newRemainingFee)}</td>
                      </tr>
                      <tr><td>Admission fee</td><td>{fmtRs(preview.admissionFee)}</td></tr>
                      <tr className="table-info">
                        <td>Revised final fee</td>
                        <td><strong>{fmtRs(preview.revisedFinalFee)}</strong></td>
                      </tr>
                      <tr><td>Already paid</td><td>{fmtRs(preview.paidAmount)}</td></tr>
                      <tr><td>Balance to collect</td><td>{fmtRs(preview.newBalance)}</td></tr>
                      <tr><td>New status</td><td><strong>{preview.newStatus}</strong></td></tr>
                      {Number(preview.walletCreditAdded) > 0 && (
                        <tr className="table-warning">
                          <td>Wallet credit</td>
                          <td>{fmtRs(preview.walletCreditAdded)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {preview.overpaidNote && (
                    <div className="alert alert-warning small">{preview.overpaidNote}</div>
                  )}

                  {/* Next-month preview */}
                  <div className="alert alert-info mt-3">
                    <h6 className="fw-bold mb-2">📅 From next month onwards</h6>
                    <table className="table table-sm table-borderless mb-0">
                      <tbody>
                        <tr>
                          <td className="text-muted" style={{ width: "45%" }}>New time slot</td>
                          <td><span className="badge bg-success">{preview.newInTime} – {preview.newOutTime}</span></td>
                        </tr>
                        <tr><td className="text-muted">New monthly fee</td><td>{fmtRs(preview.newMonthlyFee)}</td></tr>
                        <tr><td className="text-muted">Monthly discount</td><td>{fmtRs(preview.newMonthlyDiscount)}</td></tr>
                        <tr className="border-top">
                          <td className="fw-bold">Bill from next month</td>
                          <td className="fw-bold text-primary fs-5">{fmtRs(preview.nextMonthFee)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Seat picker */}
                  <h6 className="fw-bold mt-4 mb-2">
                    🪑 Choose Seat for new slot ({preview.newInTime} – {preview.newOutTime})
                  </h6>
                  <div className="card border bg-light">
                    <div className="card-body">
                      {preview.currentSeatNo != null && (
                        <div className="form-check mb-2">
                          <input
                            type="radio" id="keep-seat" className="form-check-input"
                            checked={selectedSeat === preview.currentSeatNo}
                            onChange={() => setSelectedSeat(preview.currentSeatNo)}
                            disabled={!preview.currentSeatAvailableInNewSlot}
                          />
                          <label className="form-check-label" htmlFor="keep-seat">
                            Keep <strong>Seat {preview.currentSeatNo}</strong>{" "}
                            {preview.currentSeatAvailableInNewSlot
                              ? <span className="badge bg-success ms-1">✅ available in new slot</span>
                              : <span className="badge bg-secondary ms-1">❌ unavailable</span>}
                          </label>
                        </div>
                      )}

                      <div className="form-check mb-2">
                        <input
                          type="radio" id="pick-other" className="form-check-input"
                          checked={
                            preview.currentSeatNo == null ||
                            (selectedSeat !== preview.currentSeatNo && selectedSeat != null)
                          }
                          onChange={() => {
                            // Auto-pick first available seat that's NOT the current one
                            const list = (preview.availableSeatsInNewSlot || [])
                              .filter(s => s !== preview.currentSeatNo);
                            setSelectedSeat(list[0] ?? null);
                          }}
                        />
                        <label className="form-check-label" htmlFor="pick-other">
                          Pick a different seat:
                        </label>
                      </div>

                      <div className="d-flex flex-wrap gap-2 ms-4">
                        {(preview.availableSeatsInNewSlot || [])
                          .filter(s => s !== preview.currentSeatNo)
                          .slice(0, showAllSeats ? undefined : 8)
                          .map(s => (
                            <button
                              key={s} type="button"
                              className={`btn btn-sm ${selectedSeat === s ? "btn-primary" : "btn-outline-primary"}`}
                              onClick={() => setSelectedSeat(s)}
                            >
                              Seat {s}
                            </button>
                          ))}
                        {(preview.availableSeatsInNewSlot || []).filter(s => s !== preview.currentSeatNo).length > 8 && !showAllSeats && (
                          <button type="button" className="btn btn-sm btn-link" onClick={() => setShowAllSeats(true)}>
                            Show all {(preview.availableSeatsInNewSlot || []).filter(s => s !== preview.currentSeatNo).length}
                          </button>
                        )}
                        {(preview.availableSeatsInNewSlot || []).length === 0 && (
                          <span className="text-danger small">No seats available in this slot.</span>
                        )}
                      </div>

                      {selectedSeat != null && (
                        <div className="mt-3 small text-success">
                          ✓ Selected: <strong>Seat {selectedSeat}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {preview.previousDuesWarning?.length > 0 && (
                    <div className="alert alert-warning small mt-3">
                      <strong>Previous unpaid dues:</strong>
                      <ul className="mb-0">
                        {preview.previousDuesWarning.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                  )}

                  <div className="d-flex justify-content-between gap-2 mt-4">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setStep(1)} disabled={saving}>
                      ← Back
                    </button>
                    <div className="d-flex gap-2">
                      <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>
                        Cancel
                      </button>
                      <button type="button" className="btn btn-success" onClick={handleConfirm} disabled={saving}>
                        {saving
                          ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</>
                          : "✓ Confirm Change Slot"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : step === 3 && result ? (
                // ═══════════════════════════════════════════
                // STEP 3 — Success (same as before)
                // ═══════════════════════════════════════════
                <div>
                  <div className={`alert ${Number(result.walletCreditAdded) > 0 ? "alert-warning" : "alert-success"}`}>
                    <strong>{result.message}</strong>
                  </div>

                  <table className="table table-sm table-bordered">
                    <tbody>
                      <tr><td>Old days × old rate</td><td>{result.oldDays} days → Rs.{result.oldUsedFee}</td></tr>
                      <tr><td>New days × new rate</td><td>{result.newDays} days → Rs.{result.newRemainingFee}</td></tr>
                      <tr><td>Admission fee</td><td>Rs.{result.admissionFee}</td></tr>
                      <tr className="table-info">
                        <td>Revised final fee</td>
                        <td><strong>Rs.{result.revisedFinalFee}</strong></td>
                      </tr>
                      <tr><td>Paid</td><td>Rs.{result.paidAmount}</td></tr>
                      <tr><td>New balance</td><td>Rs.{result.newBalance}</td></tr>
                      <tr><td>New status</td><td><strong>{result.newStatus}</strong></td></tr>
                      {Number(result.walletCreditAdded) > 0 && (
                        <tr className="table-warning">
                          <td>Wallet credit</td><td>Rs.{result.walletCreditAdded}</td>
                        </tr>
                      )}
                      <tr>
                        <td>Seat</td>
                        <td>
                          {result.assignedSeatNo
                            ? `Seat ${result.assignedSeatNo} assigned`
                            : "No seat assigned"}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {result.nextMonthFee != null && (
                    <div className="alert alert-info mt-3">
                      <h6 className="fw-bold mb-2">📅 From next month onwards</h6>
                      <table className="table table-sm table-borderless mb-0">
                        <tbody>
                          <tr><td className="text-muted" style={{ width: "45%" }}>New time slot</td>
                              <td><span className="badge bg-success">{result.newInTime} – {result.newOutTime}</span></td></tr>
                          <tr><td className="text-muted">New monthly fee</td><td>Rs.{result.newMonthlyFee}</td></tr>
                          <tr><td className="text-muted">Monthly discount</td><td>Rs.{result.newMonthlyDiscount}</td></tr>
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
                  {result.previousDuesWarning?.length > 0 && (
                    <div className="alert alert-warning small">
                      <strong>Previous dues:</strong>
                      <ul className="mb-0">
                        {result.previousDuesWarning.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}
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
