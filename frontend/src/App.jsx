import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import Login          from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";

import Navbar         from "./components/Navbar";
import Sidebar        from "./components/Sidebar";
import Dashboard      from "./pages/Dashboard";
import StudentRegister   from "./pages/StudentRegister";
import ActiveStudents    from "./pages/ActiveStudents";
import InactiveStudents  from "./pages/InactiveStudents";
import SeatStatus        from "./pages/SeatStatus";
import SeatCheck         from "./pages/SeatCheck";
import VacantSeats       from "./pages/VacantSeats";
import SeatAllot         from "./pages/SeatAllot";
import FeeCalculate      from "./pages/FeeCalculate";
import FeePayment        from "./pages/FeePayment";
import StudentFeeStatus  from "./pages/StudentFeeStatus";
import AllFeeStatus      from "./pages/AllFeeStatus";
import CollectionReport  from "./pages/CollectionReport";
import BulkPayment       from "./pages/BulkPayment";
import ReceiptSearch     from "./pages/ReceiptSearch";

// Layout wrapping all protected pages
function AppLayout() {
  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar />
      <div className="d-flex flex-grow-1">
        <Sidebar />
        <main className="flex-grow-1 p-4 bg-light main-content">
          <Routes>
            <Route path="/"                  element={<Dashboard />} />
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
            <Route path="/receipt-search" element={<ReceiptSearch />} />
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
      {/* Public route — no token needed */}
      <Route path="/login" element={<Login />} />

      {/* All other routes protected by JWT */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
