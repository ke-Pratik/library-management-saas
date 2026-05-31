import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sysadminApi } from "../services/api";

function SysadminTenants() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [payments, setPayments] = useState({});
  const [paymentForm, setPaymentForm] = useState({
    amount: "", paidOn: new Date().toISOString().slice(0, 10),
    monthsToExtend: 1, paymentMode: "CASH", note: "",
  });
  const [tempPassword, setTempPassword] = useState(null);
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      const res = await sysadminApi.get("/tenants");
      setTenants(res.data);
    } catch (e) {
      if (e.response?.status === 401) navigate("/sysadmin/login");
      else setErr("Failed to load tenants");
    }
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (t) => {
    await sysadminApi.post(`/tenants/${t.id}/active`, { active: !t.isActive });
    load();
  };

  const expand = async (t) => {
    if (expanded === t.id) { setExpanded(null); return; }
    setExpanded(t.id);
    setTempPassword(null);
    const res = await sysadminApi.get(`/tenants/${t.id}/payments`);
    setPayments({ ...payments, [t.id]: res.data });
  };

  const recordPayment = async (tenantId) => {
    await sysadminApi.post(`/tenants/${tenantId}/payments`, paymentForm);
    const res = await sysadminApi.get(`/tenants/${tenantId}/payments`);
    setPayments({ ...payments, [tenantId]: res.data });
    load();
  };

  const resetPassword = async (tenantId) => {
    const res = await sysadminApi.post(`/tenants/${tenantId}/reset-password`);
    setTempPassword(res.data.newTempPassword);
  };

  const logout = () => {
    localStorage.removeItem("sysadmin_token");
    localStorage.removeItem("sysadmin_username");
    navigate("/sysadmin/login");
  };

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="m-0">Tenants</h3>
        <button className="btn btn-outline-dark btn-sm" onClick={logout}>Logout</button>
      </div>
      {err && <div className="alert alert-danger py-2">{err}</div>}
      <div className="card shadow-sm">
        <div className="table-responsive">
          <table className="table table-striped table-hover mb-0">
            <thead className="table-dark">
              <tr>
                <th>Library</th>
                <th>Owner</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Active</th>
                <th>Subscription Until</th>
                <th>Onboarded</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <>
                  <tr key={t.id}>
                    <td>{t.libraryName}</td>
                    <td>{t.ownerName}</td>
                    <td>{t.ownerEmail}</td>
                    <td>{t.ownerMobile}</td>
                    <td>
                      <button className={`btn btn-sm ${t.isActive ? "btn-success" : "btn-secondary"}`}
                              onClick={() => toggleActive(t)}>
                        {t.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td>{t.subscriptionUntil || "—"}</td>
                    <td>
                      <span className={`badge ${t.onboarded ? "bg-success" : "bg-warning text-dark"}`}>
                        {t.onboarded ? "Yes" : "No"}
                      </span>
                    </td>
                    <td>{t.createdAt?.slice(0, 10)}</td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary" onClick={() => expand(t)}>
                        {expanded === t.id ? "Hide" : "Manage"}
                      </button>
                    </td>
                  </tr>
                  {expanded === t.id && (
                    <tr>
                      <td colSpan={9} className="bg-light">
                        <div className="row g-3">
                          <div className="col-md-6">
                            <h6>Payment history</h6>
                            <table className="table table-sm">
                              <thead><tr><th>Paid On</th><th>Amount</th><th>Extends To</th><th>Mode</th><th>Note</th></tr></thead>
                              <tbody>
                                {(payments[t.id] || []).map((p) => (
                                  <tr key={p.id}>
                                    <td>{p.paidOn}</td>
                                    <td>{p.amount}</td>
                                    <td>{p.extendsTo}</td>
                                    <td>{p.paymentMode}</td>
                                    <td>{p.note}</td>
                                  </tr>
                                ))}
                                {(!payments[t.id] || payments[t.id].length === 0) && (
                                  <tr><td colSpan={5} className="text-center text-muted">No payments yet</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                          <div className="col-md-6">
                            <h6>Record payment</h6>
                            <div className="row g-2">
                              <div className="col-6">
                                <input className="form-control form-control-sm" type="number" placeholder="Amount"
                                       value={paymentForm.amount}
                                       onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                              </div>
                              <div className="col-6">
                                <input className="form-control form-control-sm" type="date"
                                       value={paymentForm.paidOn}
                                       onChange={(e) => setPaymentForm({ ...paymentForm, paidOn: e.target.value })} />
                              </div>
                              <div className="col-6">
                                <input className="form-control form-control-sm" type="number" placeholder="Months"
                                       value={paymentForm.monthsToExtend}
                                       onChange={(e) => setPaymentForm({ ...paymentForm, monthsToExtend: parseInt(e.target.value || "1") })} />
                              </div>
                              <div className="col-6">
                                <select className="form-select form-select-sm"
                                        value={paymentForm.paymentMode}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}>
                                  <option>CASH</option><option>ONLINE</option><option>BANK</option>
                                </select>
                              </div>
                              <div className="col-12">
                                <input className="form-control form-control-sm" placeholder="Note"
                                       value={paymentForm.note}
                                       onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })} />
                              </div>
                              <div className="col-12 d-flex gap-2">
                                <button className="btn btn-sm btn-primary" onClick={() => recordPayment(t.id)}>
                                  Save payment
                                </button>
                                <button className="btn btn-sm btn-warning" onClick={() => resetPassword(t.id)}>
                                  Reset owner password
                                </button>
                              </div>
                              {tempPassword && (
                                <div className="col-12">
                                  <div className="alert alert-info py-2 small mb-0">
                                    Temporary password: <code>{tempPassword}</code> — share with owner now, it will not be shown again.
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {tenants.length === 0 && (
                <tr><td colSpan={9} className="text-center text-muted py-4">No tenants yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SysadminTenants;
