import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBook, FaUserCircle } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { getMySubscription } from "../services/api";

function statusChip(sub) {
  if (!sub) return null;
  const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
  switch (sub.status) {
    case "TRIAL":
      return { bg: "bg-info",    text: "text-dark",  label: `🆓 Trial (${sub.daysRemaining} day${sub.daysRemaining === 1 ? "" : "s"} left)` };
    case "ACTIVE":
      return { bg: "bg-success", text: "text-white", label: `🟢 Active till ${fmt(sub.validUntil)}` };
    case "EXPIRING_SOON":
      return { bg: "bg-warning", text: "text-dark",  label: `🟡 Expires in ${sub.daysRemaining} day${sub.daysRemaining === 1 ? "" : "s"}` };
    case "GRACE_PERIOD":
      return { bg: "bg-warning", text: "text-dark",  label: `🟠 Grace Period (${sub.graceDaysRemaining ?? 0} day${sub.graceDaysRemaining === 1 ? "" : "s"} left)` };
    case "EXPIRED":
      return { bg: "bg-danger",  text: "text-white", label: `🔴 Subscription Expired` };
    default:
      return null;
  }
}

function Navbar() {
  const navigate = useNavigate();
  const { username, role, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [sub, setSub]   = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    getMySubscription()
      .then((res) => { if (mounted) setSub(res.data); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => { logout(); navigate("/login"); };

  // ── Always force-navigate so location.key changes → Profile.jsx re-scrolls ──
  const goProfile = () => {
    setOpen(false);
    navigate("/profile", { replace: false });
  };
  const goSubscription = () => {
    setOpen(false);
    navigate("/profile#subscription", { replace: false });
  };
  const goChip = () => {
    navigate("/profile#subscription", { replace: false });
  };

  const chip = statusChip(sub);

  return (
    <nav className="navbar navbar-dark navbar-custom px-4">
      <span className="navbar-brand d-flex align-items-center gap-2 fw-bold">
        <FaBook size={22} />
        📚 Study Center Management System
      </span>

      <div className="d-flex align-items-center gap-3" ref={menuRef}>
        {chip && (
          <span
            className={`badge ${chip.bg} ${chip.text} px-3 py-2`}
            style={{ cursor: "pointer", fontWeight: 500 }}
            onClick={goChip}
            title="View subscription details"
          >
            {chip.label}
          </span>
        )}

        <div className="position-relative">
          <button
            className="btn btn-sm text-light d-flex align-items-center gap-2"
            style={{ background: "transparent", border: "none" }}
            onClick={() => setOpen((o) => !o)}
          >
            <FaUserCircle size={20} />
            <span className="small">{username || "User"}</span>
            <span style={{ fontSize: 10 }}>▾</span>
          </button>

          {open && (
            <ul
              className="dropdown-menu show shadow"
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                minWidth: "220px",
                zIndex: 1055,
                marginTop: 4,
              }}
            >
              <li className="px-3 py-2 border-bottom">
                <div className="fw-bold">{username}</div>
                <div className="small text-muted">{role || "—"}</div>
              </li>
              <li>
                <button className="dropdown-item" onClick={goProfile}>
                  👁  My Profile
                </button>
              </li>
              <li>
                <button className="dropdown-item" onClick={goSubscription}>
                  💳  Subscription
                </button>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button className="dropdown-item text-danger" onClick={() => { setOpen(false); handleLogout(); }}>
                  🚪  Logout
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
