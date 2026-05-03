import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import Navbar from "./components/Navbar.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import StudentRegister from "./pages/StudentRegister.jsx";
import ActiveStudents from "./pages/ActiveStudents.jsx";
import InactiveStudents from "./pages/InactiveStudents.jsx";
import SeatStatus from "./pages/SeatStatus.jsx";
import SeatCheck from "./pages/SeatCheck.jsx";
import VacantSeats from "./pages/VacantSeats.jsx";
import SeatAllot from "./pages/SeatAllot.jsx";
import FeeCalculate from "./pages/FeeCalculate.jsx";
import FeePayment from "./pages/FeePayment.jsx";
import StudentFeeStatus from "./pages/StudentFeeStatus.jsx";
import AllFeeStatus from "./pages/AllFeeStatus.jsx";
import CollectionReport from "./pages/CollectionReport.jsx";

function App() {
  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar />
      <div className="d-flex flex-grow-1">
        <Sidebar />
        <main className="flex-grow-1 p-4 bg-light main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/students/register" element={<StudentRegister />} />
            <Route path="/students/active" element={<ActiveStudents />} />
            <Route path="/students/inactive" element={<InactiveStudents />} />
            <Route path="/seats/status" element={<SeatStatus />} />
            <Route path="/seats/check" element={<SeatCheck />} />
            <Route path="/seats/vacant" element={<VacantSeats />} />
            <Route path="/seats/allot" element={<SeatAllot />} />
            <Route path="/fees/calculate" element={<FeeCalculate />} />
            <Route path="/fees/pay" element={<FeePayment />} />
            <Route path="/fees/student" element={<StudentFeeStatus />} />
            <Route path="/fees/status" element={<AllFeeStatus />} />
            <Route path="/fees/collection" element={<CollectionReport />} />
          </Routes>
        </main>
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

export default App;
