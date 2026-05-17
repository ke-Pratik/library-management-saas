import { useState, useEffect } from "react";
import {
  getStudentSummary,
  getSeatStatus,
  getMonthlyCollection,
} from "../services/api";
import { FaUsers, FaChair, FaRupeeSign } from "react-icons/fa";

function Dashboard() {
  const [students, setStudents] = useState({});
  const [seats, setSeats] = useState({});
  const [collection, setCollection] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const now = new Date();
        const [stuRes, seatRes, feeRes] = await Promise.all([
          getStudentSummary(),
          getSeatStatus(),
          getMonthlyCollection({
            month: now.getMonth() + 1,
            year: now.getFullYear(),
          }),
        ]);
        setStudents(stuRes.data);
        setSeats(seatRes.data);
        setCollection(feeRes.data);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading)
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-primary"></div>
      </div>
    );

  return (
    <div>
      <h2 className="page-title">📊 Dashboard</h2>

      <div className="row g-4 mb-4">
        {/* Student Card */}
        <div className="col-md-4">
          <div className="card dashboard-card border-0 h-100">
            <div className="card-body text-center">
              <FaUsers size={40} className="text-primary mb-3" />
              <h5 className="fw-bold">Students</h5>
              <div className="row mt-3">
                <div className="col">
                  <h3 className="text-success">
                    {students.activeStudents || 0}
                  </h3>
                  <small className="text-muted">Active</small>
                </div>
                <div className="col">
                  <h3 className="text-danger">
                    {students.inactiveStudents || 0}
                  </h3>
                  <small className="text-muted">Inactive</small>
                </div>
                <div className="col">
                  <h3 className="text-primary">
                    {students.totalStudents || 0}
                  </h3>
                  <small className="text-muted">Total</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Seat Card */}
        <div className="col-md-4">
          <div className="card dashboard-card border-0 h-100">
            <div className="card-body text-center">
              <FaChair size={40} className="text-success mb-3" />
              <h5 className="fw-bold">Seats</h5>
              <div className="row mt-3">
                <div className="col">
                  <h3 className="text-success">
                    {seats.fullyVacantSeats || 0}
                  </h3>
                  <small className="text-muted">Vacant</small>
                </div>
                <div className="col">
                  <h3 className="text-warning">
                    {seats.partiallyVacantSeats || 0}
                  </h3>
                  <small className="text-muted">Partial</small>
                </div>
                <div className="col">
                  <h3 className="text-danger">
                    {seats.fullyOccupiedSeats || 0}
                  </h3>
                  <small className="text-muted">Full</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fee Card */}
        <div className="col-md-4">
          <div className="card dashboard-card border-0 h-100">
            <div className="card-body text-center">
              <FaRupeeSign size={40} className="text-warning mb-3" />
              <h5 className="fw-bold">This Month</h5>
              <div className="row mt-3">
                <div className="col">
                  <h3 className="text-success">
                    ₹{collection.totalCollected || 0}
                  </h3>
                  <small className="text-muted">Collected</small>
                </div>
                <div className="col">
                  <h3 className="text-danger">
                    ₹{collection.totalBalance || 0}
                  </h3>
                  <small className="text-muted">Pending</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collection Breakdown */}
      <div className="row g-4">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h6 className="fw-bold mb-3">💵 Payment Mode Breakdown</h6>
              <div className="d-flex justify-content-between mb-2">
                <span>Cash Collected</span>
                <span className="fw-bold text-success">
                  ₹{collection.cashCollected || 0}
                </span>
              </div>
              <div className="d-flex justify-content-between">
                <span>Online Collected</span>
                <span className="fw-bold text-primary">
                  ₹{collection.onlineCollected || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h6 className="fw-bold mb-3">📋 Fee Status Count</h6>
              <div className="d-flex justify-content-between mb-2">
                <span>✅ Paid</span>
                <span className="badge badge-paid px-3 py-2">
                  {collection.paidCount || 0}
                </span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>🔶 Partial</span>
                <span className="badge badge-partial px-3 py-2">
                  {collection.partialCount || 0}
                </span>
              </div>
              <div className="d-flex justify-content-between">
                <span>⏳ Pending</span>
                <span className="badge badge-pending px-3 py-2">
                  {collection.pendingCount || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
