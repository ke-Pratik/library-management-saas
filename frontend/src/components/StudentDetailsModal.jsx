import { useEffect, useState } from "react";
import { getStudentFeeStatus } from "../services/api";
import { toast } from "react-toastify";

// ── "01-May-2026" formatter ──────────────────────────
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

// ── "Jun-2026" formatter ─────────────────────────────
const formatFeeMonth = (month, year) => {
  if (!month || !year) return "—";
  const d = new Date(year, month - 1, 1);
  return d.toLocaleString("en-US", { month: "short" }) + "-" + year;
};

// ── Payment mode badge ───────────────────────────────
const paymentModeBadge = (mode) => {
  if (!mode) return <span className="text-muted">—</span>;
  const map = {
    CASH:          { bg: "bg-success",   label: "💵 Cash" },
    UPI:           { bg: "bg-primary",   label: "📱 UPI" },
    ONLINE:        { bg: "bg-info",      label: "🌐 Online" },
    CHEQUE:        { bg: "bg-warning text-dark", label: "🏦 Cheque" },
    BANK_TRANSFER: { bg: "bg-secondary", label: "🔁 Bank Transfer" },
  };
  const cfg = map[mode.toUpperCase()] || { bg: "bg-secondary", label: mode };
  return <span className={`badge ${cfg.bg}`}>{cfg.label}</span>;
};

export default function StudentDetailsModal({ regNo, studentName, onClose }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getStudentFeeStatus(regNo);
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) toast.error(err.response?.data?.message || "Failed to load student details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [regNo]);

  const statusBadge = (s) => {
    if (s === "PAID")    return <span className="badge bg-success">✅ PAID</span>;
    if (s === "PARTIAL") return <span className="badge bg-warning text-dark">🔶 PARTIAL</span>;
    return <span className="badge bg-secondary">⏳ PENDING</span>;
  };

  const overallBadge = (s) => {
    if (s === "ALL_PAID") return <span className="badge bg-success fs-6">✅ ALL PAID</span>;
    return <span className="badge bg-danger fs-6">⚠️ HAS PENDING</span>;
  };

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} />
      <div className="modal fade show d-block" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-xl">
          <div className="modal-content">

            <div className="modal-header">
              <h5 className="modal-title fw-bold">
                👁️ Student Details — {studentName} (#{regNo})
              </h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>

            <div className="modal-body">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" />
                  <p className="mt-2 text-muted">Loading student details...</p>
                </div>
              ) : !data ? (
                <div className="alert alert-warning">No data available.</div>
              ) : (
                <>
                  {/* ── Basic info row ── */}
                  <div className="row g-3 text-center mb-3">
                    <div className="col-md-3">
                      <div className="border rounded p-2">
                        <div className="text-muted small">Reg No</div>
                        <div className="fw-bold fs-5">#{data.regNo}</div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="border rounded p-2">
                        <div className="text-muted small">Seat No</div>
                        <div className="fw-bold fs-5">{data.seatNo ? `🪑 ${data.seatNo}` : "—"}</div>
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
                        <div className="text-muted small">Status</div>
                        <div className="fw-bold">
                          {data.isActive ? "✅ Active" : "❌ Inactive"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Gender + Mobile ── */}
                  <div className="alert alert-light py-2 small mb-3">
                    👤 <strong>{data.gender}</strong> &nbsp;|&nbsp; 📱 {data.mobile}
                  </div>

                  {/* ── Fee summary cards ── */}
                  <div className="row g-3 text-center mb-3">
                    <div className="col-md-4 col-lg">
                      <div className="border rounded p-2">
                        <div className="text-muted small">Joining Date</div>
                        <div className="fw-bold">{formatDate(data.dateOfAdmission)}</div>
                      </div>
                    </div>
                    <div className="col-md-4 col-lg">
                      <div className="border rounded p-2 bg-light">
                        <div className="text-muted small">Total Fee</div>
                        <div className="fw-bold fs-5">₹{data.totalFee}</div>
                      </div>
                    </div>
                    <div className="col-md-4 col-lg">
                      <div className="border rounded p-2" style={{ background: "#fef3c7" }}>
                        <div className="text-muted small">Discount</div>
                        <div className="fw-bold fs-5 text-warning">₹{data.monthlyDiscount || 0}</div>
                      </div>
                    </div>
                    <div className="col-md-4 col-lg">
                      <div className="border rounded p-2" style={{ background: "#d1fae5" }}>
                        <div className="text-muted small">Total Paid</div>
                        <div className="fw-bold fs-5 text-success">₹{data.totalPaid}</div>
                      </div>
                    </div>
                    <div className="col-md-4 col-lg">
                      <div className="border rounded p-2" style={{ background: "#fee2e2" }}>
                        <div className="text-muted small">Balance</div>
                        <div className="fw-bold fs-5 text-danger">₹{data.totalBalance}</div>
                      </div>
                    </div>
                    <div className="col-md-4 col-lg">
                      <div className="border rounded p-2" style={{ background: "#fffbeb" }}>
                        <div className="text-muted small">💰 Wallet</div>
                        <div className="fw-bold fs-5">Rs.{data.walletBalance || 0}</div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center mb-3">
                    Overall Status: {overallBadge(data.overallStatus)}
                  </div>

                  {/* ── Monthly fee records table ── */}
                  {data.monthlyRecords && data.monthlyRecords.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-sm table-hover">
                        <thead className="table-dark">
                          <tr>
                            <th>Fee Month</th>
                            <th>Payment Date</th>
                            <th>Slot</th>
                            <th>Monthly Fee</th>
                            <th>Discount</th>
                            <th>Admission</th>
                            <th>Final Fee</th>
                            <th>Paid</th>
                            <th>Balance</th>
                            <th>Status</th>
                            <th>Payment Mode</th>
                            <th>Receipt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.monthlyRecords.map((r, i) => (
                            <tr
                              key={i}
                              className={
                                r.paymentStatus === "PAID"    ? "table-success" :
                                r.paymentStatus === "PARTIAL" ? "table-warning" : ""
                              }
                            >
                              {/* Fee Month — e.g. "Jun-2026" */}
                              <td className="fw-bold">{formatFeeMonth(r.feeMonth, r.feeYear)}</td>

                              {/* Payment Date — actual date money was paid */}
                              <td>{formatDate(r.paymentDate)}</td>

                              <td>{r.inTime} - {r.outTime}</td>
                              <td>₹{r.monthlyFee}</td>
                              <td>{r.discountAmount > 0 ? `₹${r.discountAmount}` : "—"}</td>
                              <td>{r.admissionFee  > 0 ? `₹${r.admissionFee}`  : "—"}</td>
                              <td className="fw-bold">₹{r.finalFee}</td>
                              <td className="text-success">₹{r.paidAmount}</td>
                              <td className="text-danger fw-bold">₹{r.balanceAmount}</td>
                              <td>{statusBadge(r.paymentStatus)}</td>

                              {/* Payment Mode — coloured badge */}
                              <td>{paymentModeBadge(r.paymentMode)}</td>

                              <td><small className="text-muted">{r.receiptNumber || "—"}</small></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="alert alert-warning">No fee records found for this student.</div>
                  )}
                </>
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
