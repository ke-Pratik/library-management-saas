import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { sysadminApi } from "../services/api";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

function StatusBadge({ status, daysRemaining }) {
  if (!status) return <span className="text-muted">—</span>;
  const map = {
    TRIAL:         { cls: "bg-info text-dark",    label: `🆓 Trial (${daysRemaining ?? 0}d left)` },
    ACTIVE:        { cls: "bg-success",           label: `🟢 Active` },
    EXPIRING_SOON: { cls: "bg-warning text-dark", label: `🟡 Expires in ${daysRemaining ?? 0}d` },
    GRACE_PERIOD:  { cls: "bg-warning text-dark", label: `🟠 Grace Period` },
    EXPIRED:       { cls: "bg-danger",            label: `🔴 Expired` },
  };
  const s = map[status] || { cls: "bg-secondary", label: status };
  return <span className={`badge ${s.cls} px-2 py-1`}>{s.label}</span>;
}

function Row({ label, value }) {
  return (
    <div className="row mb-2">
      <div className="col-5 text-muted">{label}</div>
      <div className="col-7 fw-semibold">{value || "—"}</div>
    </div>
  );
}

const EMPTY_FORM = {
  amount: "",
  paidOn: new Date().toISOString().slice(0, 10),
  monthsToExtend: "",
  validUntilOverride: "",
  paymentMode: "CASH",
  note: "",
};

function SysadminTenantDetail() {
  const { tenantId }  = useParams();
  const navigate      = useNavigate();
  const [tenant, setTenant]     = useState(null);
  const [payments, setPayments] = useState([]);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [tempPassword, setTempPassword] = useState(null);
  const [msg, setMsg]           = useState("");
  const [err, setErr]           = useState("");

  const load = async () => {
    setErr("");
    try {
      const [tRes, pRes] = await Promise.all([
        sysadminApi.get(`/tenants/${tenantId}`),
        sysadminApi.get(`/tenants/${tenantId}/payments`),
      ]);
      setTenant(tRes.data);
      setPayments(pRes.data);
    } catch (e) {
      if (e.response?.status === 401) navigate("/sysadmin/login");
      else setErr("Failed to load tenant");
    }
  };

  useEffect(() => { load(); }, [tenantId]);

  const toggleActive = async () => {
    await sysadminApi.post(`/tenants/${tenantId}/active`, { active: !tenant.isActive });
    load();
  };

  const recordPayment = async () => {
    setErr(""); setMsg("");
    try {
      // Build payload — empty strings → undefined so backend uses null
      const payload = {
        amount:               form.amount === "" ? null : Number(form.amount),
        paidOn:               form.paidOn || null,
        monthsToExtend:       form.monthsToExtend === "" ? null : parseInt(form.monthsToExtend),
        validUntilOverride:   form.validUntilOverride || null,
        paymentMode:          form.paymentMode,
        note:                 form.note || null,
      };

      // Client-side validation
      if (!payload.amount || payload.amount <= 0) { setErr("Amount must be greater than 0"); return; }
      if (!payload.paidOn) { setErr("Payment date is required"); return; }
      if (!payload.monthsToExtend && !payload.validUntilOverride) {
        setErr("Provide either 'Months to Extend' or 'Subscription Valid Until'");
        return;
      }

      await sysadminApi.post(`/tenants/${tenantId}/payments`, payload);
      setForm(EMPTY_FORM);
      setMsg("Payment recorded successfully.");
      load();
    } catch (e) {
      setErr(e.response?.data?.message || e.message || "Failed to record payment");
    }
  };

  const resetPassword = async () => {
    setTempPassword(null);
    const res = await sysadminApi.post(`/tenants/${tenantId}/reset-password`);
    setTempPassword(res.data.newTempPassword);
  };

  if (!tenant) {
    return (
      <div className="container-fluid p-4">
        {err ? <div className="alert alert-danger">{err}</div>
             : <div className="text-center"><div className="spinner-border text-primary" /></div>}
        <button className="btn btn-outline-secondary btn-sm mt-3" onClick={() => navigate("/sysadmin/tenants")}>
          ← Back to Tenants
        </button>
      </div>
    );
  }

  const monthsAndOverrideBothSet = form.monthsToExtend !== "" && form.validUntilOverride !== "";

  return (
    <div className="container-fluid p-4">
      {/* ── Header ── */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-3">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate("/sysadmin/tenants")}>
            ← Back
          </button>
          <h3 className="m-0">{tenant.libraryName}</h3>
          <StatusBadge status={tenant.subscriptionStatus} daysRemaining={tenant.daysRemaining} />
        </div>
      </div>

      {err && <div className="alert alert-danger py-2">{err}</div>}
      {msg && <div className="alert alert-success py-2">{msg}</div>}

      {/* ── Tenant Information ── */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h6 className="fw-bold mb-3">🏛️ Tenant Information</h6>
          <div className="row">
            <div className="col-md-6">
              <Row label="Library Name" value={tenant.libraryName} />
              <Row label="Owner Name"   value={tenant.ownerName} />
              <Row label="Owner Email"  value={tenant.ownerEmail} />
              <Row label="Owner Mobile" value={tenant.ownerMobile} />
            </div>
            <div className="col-md-6">
              <Row label="Created"   value={fmtDate(tenant.createdAt)} />
              <Row label="Onboarded" value={tenant.onboarded ? "Yes" : "No"} />
              <Row
                label="Account"
                value={
                  <button
                    className={`btn btn-sm ${tenant.isActive ? "btn-success" : "btn-secondary"}`}
                    onClick={toggleActive}
                  >
                    {tenant.isActive ? "Active" : "Inactive"}
                  </button>
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Subscription Details ── */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h6 className="fw-bold mb-3">💳 Subscription Details</h6>
          <div className="row">
            <div className="col-md-3"><Row label="Status"          value={<StatusBadge status={tenant.subscriptionStatus} daysRemaining={tenant.daysRemaining} />} /></div>
            <div className="col-md-3"><Row label="Valid Until"     value={fmtDate(tenant.subscriptionUntil)} /></div>
            <div className="col-md-3"><Row label="Days Remaining"  value={tenant.daysRemaining ?? "—"} /></div>
            <div className="col-md-3"><Row label="Effective Expiry (incl. grace)" value={fmtDate(tenant.effectiveExpiryDate)} /></div>
          </div>
        </div>
      </div>

      {/* ── Payment History ── */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h6 className="fw-bold mb-3">📜 Payment History</h6>
          <div className="table-responsive">
            <table className="table table-sm table-striped mb-0">
              <thead className="table-dark">
                <tr>
                  <th>Paid On</th>
                  <th>Amount</th>
                  <th>Extends To</th>
                  <th>Mode</th>
                  <th>Manual Override</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{fmtDate(p.paidOn)}</td>
                    <td>₹{Number(p.amount).toLocaleString("en-IN")}</td>
                    <td>{fmtDate(p.extendsTo)}</td>
                    <td>{p.paymentMode || "—"}</td>
                    <td>
                      {p.isManualOverride
                        ? <span className="badge bg-info text-dark">Override</span>
                        : <span className="badge bg-light text-muted">Auto</span>}
                    </td>
                    <td className="small">{p.note || "—"}</td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-muted py-3">No payments yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Record Payment ── */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h6 className="fw-bold mb-3">💰 Record Payment</h6>

          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label small fw-bold">Amount <span className="text-danger">*</span></label>
              <input
                type="number" className="form-control" placeholder="Enter amount"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-bold">Payment Date <span className="text-danger">*</span></label>
              <input
                type="date" className="form-control"
                value={form.paidOn}
                onChange={(e) => setForm({ ...form, paidOn: e.target.value })}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-bold">Months to Extend</label>
              <input
                type="number" className="form-control" placeholder="e.g. 1, 3, 12"
                value={form.monthsToExtend}
                onChange={(e) => setForm({ ...form, monthsToExtend: e.target.value })}
              />
              <small className="text-muted">
                Number of subscription months this payment covers. (1 = One Month, 3 = Three Months, 12 = One Year)
              </small>
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-bold">Subscription Valid Until (optional)</label>
              <input
                type="date" className="form-control"
                value={form.validUntilOverride}
                onChange={(e) => setForm({ ...form, validUntilOverride: e.target.value })}
                min={form.paidOn}
                title="If provided, this date overrides automatic month calculation."
              />
              <small className="text-muted">If provided, this date overrides automatic month calculation.</small>
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-bold">Payment Mode</label>
              <select
                className="form-select"
                value={form.paymentMode}
                onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
              >
                <option>CASH</option>
                <option>ONLINE</option>
                <option>BANK</option>
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-bold">Notes</label>
              <input
                className="form-control" placeholder="Any remarks"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
          </div>

          {monthsAndOverrideBothSet && (
            <div className="alert alert-info mt-3 mb-0 small">
              ℹ️ Both <em>Months</em> and <em>Valid Until</em> are filled — the manual <strong>Valid Until</strong> date will be used.
            </div>
          )}

          <div className="mt-3">
            <button className="btn btn-primary" onClick={recordPayment}>
              💾 Save Payment
            </button>
          </div>
        </div>
      </div>

      {/* ── Owner Password Reset ── */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h6 className="fw-bold mb-3">🔑 Owner Password</h6>
          <p className="text-muted small">
            Generates a new temporary password. Share with owner securely — it will not be shown again after closing this page.
          </p>
          <button className="btn btn-warning" onClick={resetPassword}>
            Reset Owner Password
          </button>
          {tempPassword && (
            <div className="alert alert-info mt-3 mb-0 small">
              Temporary password: <code className="fs-6">{tempPassword}</code> — share with owner now.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SysadminTenantDetail;
