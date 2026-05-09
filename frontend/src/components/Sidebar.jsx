import { NavLink } from "react-router-dom";
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
} from "react-icons/fa";

function Sidebar() {
  return (
    <div className="sidebar">
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
        <FaUserTag className="me-2" /> Student Fee
      </NavLink>
      <NavLink
        to="/fees/status"
        className={({ isActive }) => (isActive ? "active" : "")}
      >
        <FaClipboardList className="me-2" /> All Fee Status
      </NavLink>
      <NavLink
        to="/fees/collection"
        className={({ isActive }) => (isActive ? "active" : "")}
      >
        <FaChartBar className="me-2" /> Collection Report
      </NavLink>
    </div>
  );
}

export default Sidebar;
