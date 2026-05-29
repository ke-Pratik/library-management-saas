import { useEffect, useState } from "react";
import { getStudentFeeStatus } from "../services/api";
import { toast } from "react-toastify";

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
                  {/* Basic info row */}
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

                  {/* Gender + Mobile */}
                  <div className="alert alert-light py-2 small mb-3">
                    👤 <strong>{data.gender}</strong>  &nbsp;|&nbsp;  📱 {data.mobile}
                  </div>

                  {/* Fee summary row (5 cards) */}
                  <div className="row g-3 text-center mb-3">
                    <div className="col-md-3 col-lg">
                      <div className="border rounded p-2">
                        <div className="text-muted small">Joining Date</div>
                        <div className="fw-bold">{formatDate(data.dateOfAdmission)}</div>
                      </div>
                    </div>
                    <div className="col-md-3 col-lg">
                      <div className="border rounded p-2 bg-light">
                        <div className="text-muted small">Total Fee</div>
                        <div className="fw-bold fs-5">₹{data.totalFee}</div>
                      </div>
                    </div>
                    <div className="col-md-3 col-lg">
                      <div className="border rounded p-2" style={{ background: "#fef3c7" }}>
                        <div className="text-muted small">Discount</div>
                        <div className="fw-bold fs-5 text-warning">₹{data.monthlyDiscount || 0}</div>
                      </div>
                    </div>
                    <div className="col-md-3 col-lg">
                      <div className="border rounded p-2" style={{ background: "#d1fae5" }}>
                        <div className="text-muted small">Total Paid</div>
                        <div className="fw-bold fs-5 text-success">₹{data.totalPaid}</div>
                      </div>
                    </div>
                    <div className="col-md-3 col-lg">
                      <div className="border rounded p-2" style={{ background: "#fee2e2" }}>
                        <div className="text-muted small">Balance</div>
                        <div className="fw-bold fs-5 text-danger">₹{data.totalBalance}</div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center mb-3">
                    Overall Status: {overallBadge(data.overallStatus)}
                  </div>

                  {/* Monthly records */}
                  {data.monthlyRecords && data.monthlyRecords.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-sm table-hover">
                        <thead className="table-dark">
                          <tr>
                            <th>Date</th>
                            <th>Slot</th>
                            <th>Monthly Fee</th>
                            <th>Discount</th>
                            <th>Admission</th>
                            <th>Final Fee</th>
                            <th>Paid</th>
                            <th>Balance</th>
                            <th>Status</th>
                            <th>Receipt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.monthlyRecords.map((r, i) => (
                            <tr
                              key={i}
                              className={
                                r.paymentStatus === "PAID" ? "table-success" :
                                r.paymentStatus === "PARTIAL" ? "table-warning" : ""
                              }
                            >
                              <td className="fw-bold">{formatDate(r.joiningDateInMonth)}</td>
                              <td>{r.inTime} - {r.outTime}</td>
                              <td>₹{r.monthlyFee}</td>
                              <td>{r.discountAmount > 0 ? `₹${r.discountAmount}` : "—"}</td>
                              <td>{r.admissionFee > 0 ? `₹${r.admissionFee}` : "—"}</td>
                              <td className="fw-bold">₹{r.finalFee}</td>
                              <td className="text-success">₹{r.paidAmount}</td>
                              <td className="text-danger fw-bold">₹{r.balanceAmount}</td>
                              <td>{statusBadge(r.paymentStatus)}</td>
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
