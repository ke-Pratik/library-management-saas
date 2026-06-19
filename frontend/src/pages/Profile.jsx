import { useEffect, useState } from "react";
import { getMyProfile, getMySubscription } from "../services/api";

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

  useEffect(() => {
    Promise.all([getMyProfile(), getMySubscription()])
      .then(([p, s]) => {
        setProfile(p.data);
        setSub(s.data);
      })
      .catch(() => { /* handled below */ })
      .finally(() => setLoading(false));
  }, []);

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

              <h6 className="fw-bold mt-3 mb-2">🔑 Password</h6>
              <p className="text-muted small mb-0">
                To reset your password, please contact your system administrator.
              </p>
            </div>
          </div>
        </div>

        {/* ── Subscription Card ── */}
        <div className="col-12">
          <div className="card border-0 shadow-sm">
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
