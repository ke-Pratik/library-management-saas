import { useState } from "react";
import { advancePayment } from "../services/api";
import { toast } from "react-toastify";

const todayIso = () => new Date().toISOString().split("T")[0];

export default function AdvancePaymentModal({ student, onClose, onSaved }) {
  const [amount, setAmount]   = useState("");
  const [mode, setMode]       = useState("CASH");
  const [months, setMonths]   = useState([
    { month: new Date().getMonth() + 1, year: new Date().getFullYear() },
  ]);
  const [paymentDate, setPaymentDate] = useState(todayIso());
  const [useWallet, setUseWallet] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving]   = useState(false);
  const [result, setResult]   = useState(null);

  const addMonth = () => {
    const last = months[months.length - 1];
    let nm = last.month + 1, ny = last.year;
    if (nm > 12) { nm = 1; ny++; }
    setMonths([...months, { month: nm, year: ny }]);
  };

  const removeMonth = (idx) => setMonths(months.filter((_, i) => i !== idx));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await advancePayment({
        regNo: student.regNo,
        totalAmount: parseFloat(amount),
        paymentMode: mode,
        months,
        paymentDate: paymentDate || null,
        useWalletBalance: useWallet,
        remarks: remarks || null,
        adminUser: "admin",
      });
      setResult(res.data);
      toast.success("Advance payment recorded");
      onSaved && onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to process payment");
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
              <h5 className="modal-title fw-bold">💰 Advance Payment — {student.name}</h5>
              <button className="btn-close" onClick={onClose} disabled={saving} />
            </div>
            <div className="modal-body">
              {result ? (
                <div>
                  <div className="alert alert-success"><strong>{result.message}</strong></div>
                  <p><strong>Payment ID:</strong> {result.paymentId}</p>
                  <p><strong>Wallet applied:</strong> Rs.{result.walletApplied}</p>
                  <p><strong>Excess → wallet:</strong> Rs.{result.walletCreditAdded}</p>
                  <table className="table table-sm table-bordered">
                    <thead>
                      <tr>
                        <th>Month</th><th>Allocated</th><th>Balance</th><th>Status</th><th>Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.allocations.map((a, i) => (
                        <tr key={i}>
                          <td>{String(a.month).padStart(2, "0")}/{a.year}</td>
                          <td>Rs.{a.amountAllocated}</td>
                          <td>Rs.{a.newBalance}</td>
                          <td><strong>{a.newStatus}</strong></td>
                          <td><small>{a.receiptNumber}</small></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <form onSubmit={submit}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Total Amount (Rs) *</label>
                      <input
                        type="number" className="form-control" step="0.01" min="0.01" required
                        value={amount} onChange={(e) => setAmount(e.target.value)} disabled={saving}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Mode *</label>
                      <select
                        className="form-select" value={mode}
                        onChange={(e) => setMode(e.target.value)} disabled={saving}
                      >
                        <option value="CASH">CASH</option>
                        <option value="ONLINE">ONLINE</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Payment Date *</label>
                      <input
                        type="date" className="form-control"
                        value={paymentDate} max={todayIso()}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        disabled={saving} required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Months to allocate (oldest first)</label>
                      {months.map((m, i) => (
                        <div key={i} className="d-flex gap-2 mb-2">
                          <select
                            className="form-select" style={{ width: "120px" }}
                            value={m.month}
                            onChange={(e) => {
                              const nm = [...months];
                              nm[i].month = parseInt(e.target.value);
                              setMonths(nm);
                            }}
                            disabled={saving}
                          >
                            {Array.from({ length: 12 }, (_, k) =>
                              <option key={k + 1} value={k + 1}>{String(k + 1).padStart(2, "0")}</option>
                            )}
                          </select>
                          <input
                            type="number" className="form-control" style={{ width: "120px" }}
                            value={m.year} min="2020" max="2100"
                            onChange={(e) => {
                              const nm = [...months];
                              nm[i].year = parseInt(e.target.value);
                              setMonths(nm);
                            }}
                            disabled={saving}
                          />
                          {months.length > 1 && (
                            <button
                              type="button" className="btn btn-sm btn-outline-danger"
                              onClick={() => removeMonth(i)} disabled={saving}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button" className="btn btn-sm btn-outline-primary"
                        onClick={addMonth} disabled={saving}
                      >
                        + Add Month
                      </button>
                    </div>
                    <div className="col-12">
                      <div className="form-check">
                        <input
                          type="checkbox" className="form-check-input" id="useWallet"
                          checked={useWallet}
                          onChange={(e) => setUseWallet(e.target.checked)}
                          disabled={saving}
                        />
                        <label className="form-check-label" htmlFor="useWallet">
                          Apply wallet balance first
                        </label>
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Remarks</label>
                      <textarea
                        className="form-control" rows={2}
                        value={remarks} onChange={(e) => setRemarks(e.target.value)} disabled={saving}
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary mt-3" disabled={saving}>
                    {saving ? (
                      <><span className="spinner-border spinner-border-sm me-2" />Processing...</>
                    ) : (
                      "💰 Record Payment"
                    )}
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
