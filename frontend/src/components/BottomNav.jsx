import { NavLink } from "react-router-dom";
import { FaHome, FaUsers, FaCreditCard, FaChartBar, FaBars } from "react-icons/fa";

/**
 * Mobile-only bottom navigation bar.
 * Visible on screens ≤768px (controlled via CSS).
 */
function BottomNav({ onMoreClick = () => {} }) {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({ isActive }) => `bottom-nav-item ${isActive ? "active" : ""}`}>
        <FaHome />
        <span>Home</span>
      </NavLink>

      <NavLink to="/students/active" className={({ isActive }) => `bottom-nav-item ${isActive ? "active" : ""}`}>
        <FaUsers />
        <span>Students</span>
      </NavLink>

      <NavLink to="/fees/pay" className={({ isActive }) => `bottom-nav-item ${isActive ? "active" : ""}`}>
        <FaCreditCard />
        <span>Pay</span>
      </NavLink>

      <NavLink to="/fees/collection" className={({ isActive }) => `bottom-nav-item ${isActive ? "active" : ""}`}>
        <FaChartBar />
        <span>Reports</span>
      </NavLink>

      <button type="button" className="bottom-nav-item bottom-nav-more" onClick={onMoreClick}>
        <FaBars />
        <span>More</span>
      </button>
    </nav>
  );
}

export default BottomNav;
