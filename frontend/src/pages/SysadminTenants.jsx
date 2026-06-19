import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

function SysadminTenants() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [err, setErr]         = useState("");

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
          <table className="table table-striped table-hover mb-0 align-middle">
            <thead className="table-dark">
              <tr>
                <th>Library</th>
                <th>Owner</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Status</th>
                <th>Active</th>
                <th>Valid Until</th>
                <th>Onboarded</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td>{t.libraryName}</td>
                  <td>{t.ownerName}</td>
                  <td className="small">{t.ownerEmail}</td>
                  <td>{t.ownerMobile}</td>
                  <td>
                    <StatusBadge status={t.subscriptionStatus} daysRemaining={t.daysRemaining} />
                  </td>
                  <td>
                    <button
                      className={`btn btn-sm ${t.isActive ? "btn-success" : "btn-secondary"}`}
                      onClick={() => toggleActive(t)}
                    >
                      {t.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td>{fmtDate(t.subscriptionUntil)}</td>
                  <td>
                    <span className={`badge ${t.onboarded ? "bg-success" : "bg-warning text-dark"}`}>
                      {t.onboarded ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="small">{t.createdAt?.slice(0, 10)}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => navigate(`/sysadmin/tenants/${t.id}`)}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr><td colSpan={10} className="text-center text-muted py-4">No tenants yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SysadminTenants;
