import { Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import Login          from "./pages/Login";
import PublicSignup   from "./pages/PublicSignup";
import Onboarding     from "./pages/Onboarding";
import SysadminLogin  from "./pages/SysadminLogin";
import SysadminTenants from "./pages/SysadminTenants";
import SysadminTenantDetail from "./pages/SysadminTenantDetail";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";

import Navbar             from "./components/Navbar";
import Sidebar            from "./components/Sidebar";
import GracePeriodBanner  from "./components/GracePeriodBanner";
import Dashboard          from "./pages/Dashboard";
import StudentRegister    from "./pages/StudentRegister";
import ActiveStudents     from "./pages/ActiveStudents";
import InactiveStudents   from "./pages/InactiveStudents";
import SeatStatus         from "./pages/SeatStatus";
import SeatCheck          from "./pages/SeatCheck";
import VacantSeats        from "./pages/VacantSeats";
import SeatAllot          from "./pages/SeatAllot";
import FeeCalculate       from "./pages/FeeCalculate";
import FeePayment         from "./pages/FeePayment";
import StudentFeeStatus   from "./pages/StudentFeeStatus";
import AllFeeStatus       from "./pages/AllFeeStatus";
import CollectionReport   from "./pages/CollectionReport";
import BulkPayment        from "./pages/BulkPayment";
import ReceiptSearch      from "./pages/ReceiptSearch";
import Profile            from "./pages/Profile";

function SysadminGuard({ children }) {
  const t = localStorage.getItem("sysadmin_token");
  if (!t) return <Navigate to="/sysadmin/login" replace />;
  return children;
}

function OnboardingGuard({ children }) {
  const { token, onboarded } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (onboarded) return <Navigate to="/" replace />;
  return children;
}

function RequireOnboarded({ children }) {
  const { onboarded } = useAuth();
  if (!onboarded) return <Navigate to="/onboarding" replace />;
  return children;
}

function AppLayout() {
  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar />
      <GracePeriodBanner />
      <div className="d-flex flex-grow-1">
        <Sidebar />
        <main className="flex-grow-1 p-4 bg-light main-content">
          <Routes>
            <Route path="/"                  element={<Dashboard />} />
            <Route path="/profile"           element={<Profile />} />
            <Route path="/students/register" element={<StudentRegister />} />
            <Route path="/students/active"   element={<ActiveStudents />} />
            <Route path="/students/inactive" element={<InactiveStudents />} />
            <Route path="/seats/status"      element={<SeatStatus />} />
            <Route path="/seats/check"       element={<SeatCheck />} />
            <Route path="/seats/vacant"      element={<VacantSeats />} />
            <Route path="/seats/allot"       element={<SeatAllot />} />
            <Route path="/fees/calculate"    element={<FeeCalculate />} />
            <Route path="/fees/pay"          element={<FeePayment />} />
            <Route path="/fees/student"      element={<StudentFeeStatus />} />
            <Route path="/fees/status"       element={<AllFeeStatus />} />
            <Route path="/fees/bulk-payment" element={<BulkPayment />} />
            <Route path="/receipt-search"    element={<ReceiptSearch />} />
            <Route path="/fees/collection"   element={<CollectionReport />} />
          </Routes>
        </main>
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<PublicSignup />} />

      <Route path="/sysadmin/login" element={<SysadminLogin />} />
      <Route path="/sysadmin/tenants" element={<SysadminGuard><SysadminTenants /></SysadminGuard>} />
      <Route path="/sysadmin/tenants/:tenantId" element={<SysadminGuard><SysadminTenantDetail /></SysadminGuard>} />

      <Route
        path="/onboarding"
        element={<OnboardingGuard><Onboarding /></OnboardingGuard>}
      />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <RequireOnboarded>
              <AppLayout />
            </RequireOnboarded>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
