import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getMyProfile, getMySubscription, changeMyPassword } from "../services/api";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

function StatusBadge({ status }) {
  const map = {
    TRIAL:         { bg: "bg-info",    text: "text-dark",  label: "Free Trial" },
    ACTIVE:        { bg: "bg-success", text: "text-white", label: "Active" },
    EXPIRING_SOON: { bg: "bg-warning", text: "text-dark",  label: "Expiring Soon" },
    GRACE_PERIOD:  { bg: "bg-warning", text: "text-dark",  label: "Grace Period" },
    EXPIRED:       { bg: "bg-danger",  text: "text-white", label: "Expired" },
  };
  const s = map[status] || { bg: "bg-secondary", text: "text-white", label: status || "—" };
  return <span className={`badge ${s.bg} ${s.text} px-3 py-2`}>{s.label}</span>;
}

function Row({ label, value }) {
  return (
    <div className="row mb-2">
      <div className="col-5 text-muted">{label}</div>
      <div className="col-7 fw-semibold">{value || "—"}</div>
    </div>
  );
}

function Profile() {
  const [profile, setProfile] = useState(null);
  const [sub, setSub]         = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // ── Change password state ──
  const [pwdForm, setPwdForm] = useState({ oldPassword: "", newPassword: "", confirm: "" });
  const [pwdMsg, setPwdMsg]   = useState("");
  const [pwdErr, setPwdErr]   = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    Promise.all([getMyProfile(), getMySubscription()])
      .then(([p, s]) => {
        setProfile(p.data);
        setSub(s.data);
      })
      .catch(() => { /* handled below */ })
      .finally(() => setLoading(false));
  }, []);

  // ── Scroll to subscription section if URL hash is #subscription ──
  useEffect(() => {
    if (loading) return;
    if (location.hash === "#subscription") {
      setTimeout(() => {
        document.getElementById("subscription-card")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [location.hash, location.key, loading]);

  const submitChangePassword = async (e) => {
    e.preventDefault();
    setPwdMsg(""); setPwdErr("");
    const { oldPassword, newPassword, confirm } = pwdForm;
    if (!oldPassword) { setPwdErr("Enter your current password"); return; }
    if (!newPassword || newPassword.length < 6) {
      setPwdErr("New password must be at least 6 characters"); return;
    }
    if (newPassword !== confirm) {
      setPwdErr("New passwords do not match"); return;
    }
    if (oldPassword === newPassword) {
      setPwdErr("New password must be different from current"); return;
    }
    try {
      setPwdBusy(true);
      await changeMyPassword({ oldPassword, newPassword });
      setPwdMsg("✓ Password updated successfully. Use the new password next time you log in.");
      setPwdForm({ oldPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      setPwdErr(err.response?.data?.message || err.response?.data?.error || "Failed to update password");
    } finally {
      setPwdBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-primary" />
        <p className="mt-2 text-muted">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return <div className="alert alert-danger">Failed to load profile.</div>;
  }

  return (
    <div>
      <h2 className="page-title mb-4">👤 My Profile</h2>

      <div className="row g-4">
        {/* ── Library Info ── */}
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h6 className="fw-bold mb-3">🏛️ Library Information</h6>
              <Row label="Library Name" value={profile.libraryName} />
              <Row label="Owner Name"   value={profile.ownerName} />
              <Row label="Owner Email"  value={profile.ownerEmail} />
              <Row label="Owner Mobile" value={profile.ownerMobile} />
              <Row label="Member Since" value={fmtDate(profile.memberSince)} />
            </div>
          </div>
        </div>

        {/* ── Account Info ── */}
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h6 className="fw-bold mb-3">🔐 Account Information</h6>
              <Row label="Username" value={profile.username} />
              <Row label="Role"     value={profile.role} />

              <hr />

              <h6 className="fw-bold mt-3 mb-3">🔑 Change Password</h6>

              {pwdErr && <div className="alert alert-danger py-2 small">{pwdErr}</div>}
              {pwdMsg && <div className="alert alert-success py-2 small">{pwdMsg}</div>}

              <form onSubmit={submitChangePassword}>
                <div className="mb-2">
                  <label className="form-label small fw-bold">Current Password</label>
                  <input
                    type={showPwd ? "text" : "password"}
                    className="form-control form-control-sm"
                    value={pwdForm.oldPassword}
                    onChange={(e) => setPwdForm({ ...pwdForm, oldPassword: e.target.value })}
                    autoComplete="current-password"
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label small fw-bold">New Password</label>
                  <input
                    type={showPwd ? "text" : "password"}
                    className="form-control form-control-sm"
                    placeholder="Min 6 characters"
                    value={pwdForm.newPassword}
                    onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                    autoComplete="new-password"
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label small fw-bold">Confirm New Password</label>
                  <input
                    type={showPwd ? "text" : "password"}
                    className="form-control form-control-sm"
                    value={pwdForm.confirm}
                    onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })}
                    autoComplete="new-password"
                  />
                </div>
                <div className="form-check small mb-3">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="showPwd"
                    checked={showPwd}
                    onChange={() => setShowPwd((s) => !s)}
                  />
                  <label className="form-check-label" htmlFor="showPwd">Show passwords</label>
                </div>
                <button type="submit" className="btn btn-primary btn-sm" disabled={pwdBusy}>
                  {pwdBusy ? "Updating..." : "Update Password"}
                </button>
              </form>

              <p className="text-muted small mt-3 mb-0">
                Forgot password? Contact your system administrator.
              </p>
            </div>
          </div>
        </div>

        {/* ── Subscription Card ── */}
        <div className="col-12">
          <div id="subscription-card" className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0">💳 Subscription Status</h6>
                {sub && <StatusBadge status={sub.status} />}
              </div>

              {!sub && <p className="text-muted">Subscription details unavailable.</p>}

              {sub && sub.status === "TRIAL" && (
                <div className="row">
                  <div className="col-md-3"><Row label="Status"         value="Free Trial" /></div>
                  <div className="col-md-3"><Row label="Trial Ends"     value={fmtDate(sub.validUntil)} /></div>
                  <div className="col-md-3"><Row label="Days Remaining" value={sub.daysRemaining} /></div>
                </div>
              )}

              {sub && sub.status === "ACTIVE" && (
                <div className="row">
                  <div className="col-md-3"><Row label="Status"         value="Active" /></div>
                  <div className="col-md-3"><Row label="Valid Until"    value={fmtDate(sub.validUntil)} /></div>
                  <div className="col-md-3"><Row label="Days Remaining" value={sub.daysRemaining} /></div>
                </div>
              )}

              {sub && sub.status === "EXPIRING_SOON" && (
                <>
                  <div className="row">
                    <div className="col-md-3"><Row label="Status"         value="Expiring Soon" /></div>
                    <div className="col-md-3"><Row label="Valid Until"    value={fmtDate(sub.validUntil)} /></div>
                    <div className="col-md-3"><Row label="Days Remaining" value={sub.daysRemaining} /></div>
                  </div>
                  <div className="alert alert-warning mt-2 mb-0 small">Contact your system administrator for renewal.</div>
                </>
              )}

              {sub && sub.status === "GRACE_PERIOD" && (
                <>
                  <div className="row">
                    <div className="col-md-3"><Row label="Status"     value="Grace Period" /></div>
                    <div className="col-md-3"><Row label="Expired On" value={fmtDate(sub.expiredOn)} /></div>
                    <div className="col-md-3"><Row label="Grace Ends" value={fmtDate(sub.graceEnds)} /></div>
                    <div className="col-md-3"><Row label="Remaining"  value={`${sub.graceDaysRemaining ?? 0} day(s)`} /></div>
                  </div>
                  <div className="alert alert-danger mt-2 mb-0 small">Renew to avoid service block.</div>
                </>
              )}

              {sub && sub.status === "EXPIRED" && (
                <>
                  <div className="row">
                    <div className="col-md-3"><Row label="Status"     value="Expired" /></div>
                    <div className="col-md-3"><Row label="Expired On" value={fmtDate(sub.expiredOn)} /></div>
                  </div>
                  <div className="alert alert-danger mt-2 mb-0 small">Contact your system administrator for renewal.</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
