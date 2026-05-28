import { useState } from "react";
import { slotChange } from "../services/api";
import { toast } from "react-toastify";

export default function SlotChangeModal({ student, onClose, onSaved }) {
  const [inTime, setInTime]     = useState("");
  const [outTime, setOutTime]   = useState("");
  const [discount, setDiscount] = useState("0");
  const [reason, setReason]     = useState("");
  const [saving, setSaving]     = useState(false);
  const [result, setResult]     = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await slotChange({
        regNo: student.regNo,
        newInTime: inTime, newOutTime: outTime,
        newDiscount: discount === "" ? 0 : parseFloat(discount),
        reason, adminUser: "admin",
      });
      setResult(res.data);
      toast.success("Slot changed successfully");
      onSaved && onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change slot");
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
            <div className="modal-header">
              <h5 className="modal-title fw-bold">🕐 Change Slot — {student.name} (#{student.regNo})</h5>
              <button className="btn-close" onClick={onClose} disabled={saving} />
            </div>
            <div className="modal-body">
              {result ? (
                <div>
                  <div className={`alert ${result.walletCreditAdded > 0 ? "alert-warning" : "alert-success"}`}>
                    <strong>{result.message}</strong>
                  </div>
                  <table className="table table-sm table-bordered">
                    <tbody>
                      <tr><td>Old days × old rate</td><td>{result.oldDays} days → Rs.{result.oldUsedFee}</td></tr>
                      <tr><td>New days × new rate</td><td>{result.newDays} days → Rs.{result.newRemainingFee}</td></tr>
                      <tr><td>Admission fee</td><td>Rs.{result.admissionFee}</td></tr>
                      <tr className="table-info"><td>Revised final fee</td><td><strong>Rs.{result.revisedFinalFee}</strong></td></tr>
                      <tr><td>Paid</td><td>Rs.{result.paidAmount}</td></tr>
                      <tr><td>New balance</td><td>Rs.{result.newBalance}</td></tr>
                      <tr><td>New status</td><td><strong>{result.newStatus}</strong></td></tr>
                      {result.walletCreditAdded > 0 && (
                        <tr className="table-warning"><td>Wallet credit</td><td>Rs.{result.walletCreditAdded}</td></tr>
                      )}
                      <tr><td>Seat</td><td>{result.assignedSeatNo ? `Seat ${result.assignedSeatNo} reallotted` : "Manual re-allot needed"}</td></tr>
                    </tbody>
                  </table>
                  {result.overpaidNote && <div className="alert alert-warning small">{result.overpaidNote}</div>}
                  {result.previousDuesWarning?.length > 0 && (
                    <div className="alert alert-warning small">
                      <strong>Previous dues:</strong>
                      <ul className="mb-0">{result.previousDuesWarning.map((w,i) => <li key={i}>{w}</li>)}</ul>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={submit}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">New In Time *</label>
                      <input type="time" className="form-control" required
                        value={inTime} onChange={(e) => setInTime(e.target.value)} disabled={saving} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">New Out Time *</label>
                      <input type="time" className="form-control" required
                        value={outTime} onChange={(e) => setOutTime(e.target.value)} disabled={saving} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Discount (Rs)</label>
                      <input type="number" className="form-control" step="0.01" min="0"
                        value={discount} onChange={(e) => setDiscount(e.target.value)} disabled={saving} />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Reason *</label>
                      <textarea className="form-control" required rows={2}
                        value={reason} onChange={(e) => setReason(e.target.value)} disabled={saving} />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary mt-3" disabled={saving}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</> : "🕐 Change Slot"}
                  </button>
                </form>
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
