import { NavLink, useNavigate } from "react-router-dom";
import {
  FaHome,
  FaUserPlus,
  FaUsers,
  FaUserSlash,
  FaChair,
  FaSearch,
  FaListAlt,
  FaPlusCircle,
  FaCalculator,
  FaCreditCard,
  FaUserTag,
  FaClipboardList,
  FaChartBar,
  FaSignOutAlt,
  FaLayerGroup, // ← Bulk Payment icon
  FaPrint, // ← Receipt Reprint icon
} from "react-icons/fa";

function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    navigate("/login");
  };

  return (
    <div className="sidebar d-flex flex-column justify-content-between">
      <div>
        <NavLink
          to="/"
          end
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <FaHome className="me-2" /> Dashboard
        </NavLink>

        <div className="section-title">👥 Students</div>
        <NavLink
          to="/students/register"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <FaUserPlus className="me-2" /> Register
        </NavLink>
        <NavLink
          to="/students/active"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <FaUsers className="me-2" /> Active
        </NavLink>
        <NavLink
          to="/students/inactive"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <FaUserSlash className="me-2" /> Inactive
        </NavLink>

        <div className="section-title">🪑 Seats</div>
        <NavLink
          to="/seats/allot"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <FaPlusCircle className="me-2" /> Allot Seat
        </NavLink>
        <NavLink
          to="/seats/status"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <FaChair className="me-2" /> Seat Status
        </NavLink>
        <NavLink
          to="/seats/check"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <FaSearch className="me-2" /> Check Seat
        </NavLink>
        <div className="section-title">💰 Fees</div>
        <NavLink
          to="/fees/calculate"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <FaCalculator className="me-2" /> Calculate Fee
        </NavLink>
        <NavLink
          to="/fees/pay"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <FaCreditCard className="me-2" /> Payment
        </NavLink>
        <NavLink
          to="/fees/student"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <FaUserTag className="me-2" /> Student Details
        </NavLink>
        <NavLink
          to="/fees/status"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <FaClipboardList className="me-2" /> All Fee Status
        </NavLink>
       <NavLink
  to="/fees/bulk-payment"
  className={({ isActive }) => (isActive ? "active" : "")}
>
  <FaLayerGroup className="me-2" /> Bulk Payment
</NavLink>

<NavLink
  to="/receipt-search"
  className={({ isActive }) => (isActive ? "active" : "")}
>
  <FaPrint className="me-2" /> Receipt Reprint
</NavLink>
        <NavLink
          to="/fees/collection"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
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
  );
}

export default Sidebar;
