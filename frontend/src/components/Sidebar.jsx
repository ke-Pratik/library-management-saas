import { NavLink, useNavigate } from "react-router-dom";
import {
  FaHome, FaUserPlus, FaUsers, FaUserSlash, FaChair, FaSearch,
  FaClipboardList, FaPlusCircle, FaCalculator, FaCreditCard,
  FaUserTag, FaChartBar, FaSignOutAlt, FaLayerGroup, FaPrint, FaTimes,
} from "react-icons/fa";

function Sidebar({ mobileOpen = false, onMobileClose = () => {} }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    navigate("/login");
  };

  // Auto-close mobile menu when a nav link is clicked
  const handleNavClick = () => {
    onMobileClose();
  };

  return (
    <>
      {/* Backdrop — only visible on mobile when menu is open */}
      <div
        className={`sidebar-backdrop ${mobileOpen ? "show" : ""}`}
        onClick={onMobileClose}
      />

      <div className={`sidebar d-flex flex-column justify-content-between ${mobileOpen ? "mobile-open" : ""}`}>
        <div>
          {/* Close button — only visible on mobile */}
          <div className="sidebar-close-btn">
            <button
              type="button"
              className="btn btn-sm text-light"
              style={{ background: "transparent", border: "none", fontSize: 20 }}
              onClick={onMobileClose}
              aria-label="Close menu"
            >
              <FaTimes />
            </button>
          </div>

          <NavLink
            to="/"
            end
            className={({ isActive }) => (isActive ? "active" : "")}
            onClick={handleNavClick}
          >
            <FaHome className="me-2" /> Dashboard
          </NavLink>

          {/* ═══ STUDENTS ═══ */}
          <div className="section-title">👥 Students</div>
          <NavLink to="/students/register" className={({ isActive }) => (isActive ? "active" : "")} onClick={handleNavClick}>
            <FaUserPlus className="me-2" /> Register Student
          </NavLink>
          <NavLink to="/students/active" className={({ isActive }) => (isActive ? "active" : "")} onClick={handleNavClick}>
            <FaUsers className="me-2" /> Active Students
          </NavLink>
          <NavLink to="/students/inactive" className={({ isActive }) => (isActive ? "active" : "")} onClick={handleNavClick}>
            <FaUserSlash className="me-2" /> Inactive Students
          </NavLink>
          <NavLink to="/fees/student" className={({ isActive }) => (isActive ? "active" : "")} onClick={handleNavClick}>
            <FaUserTag className="me-2" /> Student Details
          </NavLink>

          {/* ═══ SEATS ═══ */}
          <div className="section-title">🪑 Seats</div>
          <NavLink to="/seats/allot" className={({ isActive }) => (isActive ? "active" : "")} onClick={handleNavClick}>
            <FaPlusCircle className="me-2" /> Allot Seat
          </NavLink>
          <NavLink to="/seats/status" className={({ isActive }) => (isActive ? "active" : "")} onClick={handleNavClick}>
            <FaChair className="me-2" /> Seat Status
          </NavLink>
          <NavLink to="/seats/check" className={({ isActive }) => (isActive ? "active" : "")} onClick={handleNavClick}>
            <FaSearch className="me-2" /> Check Availability
          </NavLink>

          {/* ═══ FEES ═══ */}
          <div className="section-title">💰 Fees</div>
          <NavLink to="/fees/calculate" className={({ isActive }) => (isActive ? "active" : "")} onClick={handleNavClick}>
            <FaCalculator className="me-2" /> Fee Calculator
          </NavLink>
          <NavLink to="/fees/pay" className={({ isActive }) => (isActive ? "active" : "")} onClick={handleNavClick}>
            <FaCreditCard className="me-2" /> Fee Payment
          </NavLink>
          <NavLink to="/fees/bulk-payment" className={({ isActive }) => (isActive ? "active" : "")} onClick={handleNavClick}>
            <FaLayerGroup className="me-2" /> Bulk Payment
          </NavLink>
          <NavLink to="/receipt-search" className={({ isActive }) => (isActive ? "active" : "")} onClick={handleNavClick}>
            <FaPrint className="me-2" /> Reprint Receipt
          </NavLink>

          {/* ═══ REPORTS ═══ */}
          <div className="section-title">📊 Reports</div>
          <NavLink to="/fees/status" className={({ isActive }) => (isActive ? "active" : "")} onClick={handleNavClick}>
            <FaClipboardList className="me-2" /> Monthly Fee Status
          </NavLink>
          <NavLink to="/fees/collection" className={({ isActive }) => (isActive ? "active" : "")} onClick={handleNavClick}>
            <FaChartBar className="me-2" /> Collection Report
          </NavLink>
        </div>

        {/* Logout Button */}
        <div className="p-2 mt-3">
          <button
            onClick={handleLogout}
            className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2"
          >
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>
    </>
  );
}

export default Sidebar;
