import { useState, useEffect } from "react";
import { getWallet, getWalletTx, refundWalletCash } from "../services/api";
import { toast } from "react-toastify";

export default function WalletModal({ regNo, studentName, onClose, onChanged }) {
  const [balance, setBalance]     = useState(null);
  const [txList, setTxList]       = useState([]);
  const [loading, setLoading]     = useState(true);

  // Refund state
  const [showRefund, setShowRefund] = useState(false);
  const [refundAmt, setRefundAmt]   = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding]   = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [w, t] = await Promise.all([
        getWallet(regNo),
        getWalletTx(regNo),
      ]);
      setBalance(w.data.balance);
      setTxList(t.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load wallet");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [regNo]);

  const submitRefund = async (e) => {
    e.preventDefault();
    const amt = parseFloat(refundAmt);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (amt > Number(balance)) { toast.error("Cannot exceed wallet balance"); return; }

    setRefunding(true);
    try {
      await refundWalletCash(regNo, {
        amount: amt,
        reason: refundReason || "Cash refund to student",
        user: "admin",
      });
      toast.success(`Refunded Rs.${amt} to ${studentName}`);
      setShowRefund(false);
      setRefundAmt("");
      setRefundReason("");
      await load();
      onChanged && onChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || "Refund failed");
    } finally {
      setRefunding(false);
    }
  };

  const txTypeLabel = (type) => {
    const map = {
      CREDIT_FROM_RECALC:        ["success", "↗️ Credit (recalc)"],
      CREDIT_ADVANCE_PAYMENT:    ["success", "↗️ Credit (advance)"],
      DEBIT_APPLIED_TO_FEE:      ["primary", "↙️ Applied to fee"],
      DEBIT_REFUND_CASH:         ["warning", "💸 Refunded (cash)"],
    };
    const [color, label] = map[type] || ["secondary", type];
    return <span className={`badge bg-${color}`}>{label}</span>;
  };

  const isCredit = (type) => type?.startsWith("CREDIT");

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} />
      <div className="modal fade show d-block" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">

            <div className="modal-header">
              <h5 className="modal-title fw-bold">
                💰 Wallet — {studentName} (#{regNo})
              </h5>
              <button className="btn-close" onClick={onClose} disabled={refunding} />
            </div>

            <div className="modal-body">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" />
                  <p className="mt-2 text-muted">Loading wallet...</p>
                </div>
              ) : (
                <>
                  {/* Balance card */}
                  <div className={`alert ${Number(balance) > 0 ? "alert-success" : "alert-secondary"} d-flex justify-content-between align-items-center`}>
                    <div>
                      <div className="fw-bold fs-5">Current Balance</div>
                      <div className="fs-3 fw-bold">Rs.{Number(balance).toFixed(2)}</div>
                    </div>
                    {Number(balance) > 0 && !showRefund && (
                      <button
                        className="btn btn-warning"
                        onClick={() => setShowRefund(true)}
                      >
                        💸 Refund Cash
                      </button>
                    )}
                  </div>

                  {/* Refund form */}
                  {showRefund && (
                    <form onSubmit={submitRefund} className="border rounded p-3 mb-3 bg-light">
                      <p className="fw-semibold mb-2">💸 Refund Cash to Student</p>
                      <div className="row g-2">
                        <div className="col-md-4">
                          <label className="form-label small">Amount (Rs)</label>
                          <input
                            type="number" step="0.01" min="0.01" max={balance}
                            className="form-control" required
                            value={refundAmt}
                            onChange={(e) => setRefundAmt(e.target.value)}
                            disabled={refunding}
                          />
                        </div>
                        <div className="col-md-8">
                          <label className="form-label small">Reason</label>
                          <input
                            type="text" className="form-control"
                            placeholder="e.g. Student requested withdrawal"
                            value={refundReason}
                            onChange={(e) => setRefundReason(e.target.value)}
                            disabled={refunding}
                          />
                        </div>
                      </div>
                      <div className="mt-2 d-flex gap-2">
                        <button type="submit" className="btn btn-sm btn-warning" disabled={refunding}>
                          {refunding ? <><span className="spinner-border spinner-border-sm me-2" />Processing...</> : "Confirm Refund"}
                        </button>
                        <button type="button" className="btn btn-sm btn-secondary"
                          onClick={() => setShowRefund(false)} disabled={refunding}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Transaction history */}
                  <p className="fw-bold mb-2">Transaction History</p>
                  {txList.length === 0 ? (
                    <div className="alert alert-light text-center text-muted small">
                      No wallet activity yet.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered align-middle">
                        <thead className="table-dark">
                          <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Balance After</th>
                            <th>Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {txList.map((tx) => (
                            <tr key={tx.txId}>
                              <td className="small">{new Date(tx.createdAt).toLocaleString()}</td>
                              <td>{txTypeLabel(tx.txType)}</td>
                              <td className={isCredit(tx.txType) ? "text-success fw-bold" : "text-danger fw-bold"}>
                                {isCredit(tx.txType) ? "+" : "−"}Rs.{Number(tx.amount).toFixed(2)}
                              </td>
                              <td>Rs.{Number(tx.balanceAfter).toFixed(2)}</td>
                              <td className="small text-muted">{tx.reason || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose} disabled={refunding}>
                Close
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
