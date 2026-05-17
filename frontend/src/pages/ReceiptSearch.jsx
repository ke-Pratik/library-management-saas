import { useState } from "react";
import { getReceipt } from "../services/api";
import { toast } from "react-toastify";

function ReceiptSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) {
      toast.error("Enter a receipt number");
      return;
    }
    setLoading(true);
    setReceipt(null);
    try {
      const res = await getReceipt(query.trim().toUpperCase());
      setReceipt(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Receipt not found");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (r) => {
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
          <tr><td>Student Name</td><td>${r.studentName}</td></tr>
          <tr><td>Reg No</td><td>${r.regNo}</td></tr>
          <tr><td>Time Slot</td><td>${r.timeSlot || "—"}</td></tr>
          <tr><td>Fee Month</td><td>${r.feeMonth} / ${r.feeYear}</td></tr>
        </table>
        <div class="dash"></div>
        <table>
          <tr><td>Total Fee</td><td>₹${r.finalFee}</td></tr>
          <tr><td>Amount Paid</td><td class="big">₹${r.amountPaid}</td></tr>
          <tr><td>Balance</td><td class="bal">₹${r.balanceAmount}</td></tr>
          <tr><td>Payment Mode</td><td>${r.paymentMode || "—"}</td></tr>
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

  return (
    <div>
      <h2 className="page-title">🖨️ Receipt Reprint</h2>
      <p className="text-muted mb-4">
        Search any past receipt by its receipt number and reprint it.
      </p>

      {/* Search */}
      <div className="form-section col-lg-6 mb-4">
        <form onSubmit={handleSearch} className="d-flex gap-3 align-items-end">
          <div className="flex-grow-1">
            <label className="form-label fw-bold">Receipt Number</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. RCPT-052026-0042"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Searching..." : "🔍 Search"}
          </button>
        </form>
      </div>

      {/* Result */}
      {receipt && (
        <div className="form-section col-lg-6">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <h5 className="fw-bold mb-0">
              Receipt:{" "}
              <span className="text-primary">{receipt.receiptNumber}</span>
            </h5>
            <button
              className="btn btn-success"
              onClick={() => handlePrint(receipt)}
            >
              🖨️ Print / Save
            </button>
          </div>

          <table className="table table-sm table-bordered">
            <tbody>
              <tr>
                <td className="text-muted fw-bold" style={{ width: "40%" }}>
                  Student
                </td>
                <td>
                  {receipt.studentName} (Reg: {receipt.regNo})
                </td>
              </tr>
              <tr>
                <td className="text-muted fw-bold">Time Slot</td>
                <td>{receipt.timeSlot || "—"}</td>
              </tr>
              <tr>
                <td className="text-muted fw-bold">Fee Month</td>
                <td>
                  {receipt.feeMonth} / {receipt.feeYear}
                </td>
              </tr>
              <tr>
                <td className="text-muted fw-bold">Total Fee</td>
                <td>₹{receipt.finalFee}</td>
              </tr>
              <tr>
                <td className="text-muted fw-bold">Amount Paid</td>
                <td className="fw-bold text-success fs-5">
                  ₹{receipt.amountPaid}
                </td>
              </tr>
              <tr>
                <td className="text-muted fw-bold">Balance</td>
                <td
                  className={
                    Number(receipt.balanceAmount) > 0
                      ? "fw-bold text-danger"
                      : "fw-bold text-success"
                  }
                >
                  ₹{receipt.balanceAmount}
                </td>
              </tr>
              <tr>
                <td className="text-muted fw-bold">Status</td>
                <td>
                  <span
                    className={`badge ${
                      receipt.paymentStatus === "PAID"
                        ? "bg-success"
                        : "bg-warning text-dark"
                    }`}
                  >
                    {receipt.paymentStatus === "PAID"
                      ? "✅ PAID"
                      : "🔶 PARTIAL"}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="text-muted fw-bold">Mode</td>
                <td>{receipt.paymentMode || "—"}</td>
              </tr>
              <tr>
                <td className="text-muted fw-bold">Payment Date</td>
                <td>{receipt.paymentDate || "—"}</td>
              </tr>
            </tbody>
          </table>

          <small className="text-muted">
            ⚠️ This is a reprint. Original payment details are shown above.
          </small>
        </div>
      )}
    </div>
  );
}

export default ReceiptSearch;
