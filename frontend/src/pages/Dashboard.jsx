import { useState, useEffect } from "react";
import {
  getStudentSummary,
  getSeatStatus,
  getMonthlyCollection,
} from "../services/api";
import { FaUsers, FaChair, FaRupeeSign, FaQuestionCircle } from "react-icons/fa";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const PIE_COLORS = ["#dc3545", "#198754"]; // Occupied = red, Vacant = green

function Dashboard() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [students, setStudents] = useState({});
  const [seats, setSeats] = useState({});
  const [collection, setCollection] = useState({});
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDuesDetail, setShowDuesDetail] = useState(false);

  const fetchDashboard = async () => {
    setLoading(true);

    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1);
      months.push({ month: d.getMonth() + 1, year: d.getFullYear() });
    }

    try {
      const results = await Promise.allSettled([
        getStudentSummary(),
        getSeatStatus(),
        getMonthlyCollection({ month: currentMonth, year: currentYear }),
        ...months.map(({ month, year }) => getMonthlyCollection({ month, year })),
      ]);

      if (results[0].status === "fulfilled") setStudents(results[0].value.data);
      if (results[1].status === "fulfilled") setSeats(results[1].value.data);
      if (results[2].status === "fulfilled") setCollection(results[2].value.data);

      const trend = months.map(({ month, year }, idx) => ({
        label: `${MONTH_NAMES[month - 1]} '${String(year).slice(2)}`,
        collection:
          results[idx + 3]?.status === "fulfilled"
            ? results[idx + 3].value.data?.totalCollected || 0
            : 0,
      }));
      setMonthlyTrend(trend);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const studentsWithDues =
    (collection.pendingCount || 0) + (collection.partialCount || 0);
  const studentsWithRecord =
    (collection.paidCount || 0) +
    (collection.partialCount || 0) +
    (collection.pendingCount || 0);
  const noFeeRecord = Math.max(
    0,
    (students.activeStudents || 0) - studentsWithRecord
  );

  const seatPieData = [
    { name: "Occupied", value: seats.occupiedSeats || 0 },
    { name: "Vacant",   value: seats.vacantSeats   || 0 },
  ];

  if (loading)
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-primary"></div>
        <p className="mt-2 text-muted">Loading dashboard...</p>
      </div>
    );

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="page-title mb-0">📊 Dashboard</h2>
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={fetchDashboard}
        >
          🔄 Refresh
        </button>
      </div>

      {/* ─── Dues Alert Banner ─────────────────────────────────── */}
      {studentsWithDues > 0 && (
        <div
          className="alert alert-warning d-flex justify-content-between align-items-center mb-4"
          style={{ cursor: "pointer" }}
          onClick={() => setShowDuesDetail(!showDuesDetail)}
        >
          <span>
            ⚠️ <strong>{studentsWithDues} student(s)</strong> have pending or
            partial dues for{" "}
            <strong>
              {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </strong>{" "}
            — collect fees from the Fee section.
          </span>
          <span className="text-muted small">
            {showDuesDetail ? "▲ Hide" : "▼ Details"}
          </span>
        </div>
      )}

      {/* Dues Breakdown (expandable) */}
      {showDuesDetail && (
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <div className="card border-danger text-center">
              <div className="card-body py-2">
                <h6 className="text-muted mb-1">⏳ Pending (₹0 paid)</h6>
                <h3 className="fw-bold text-danger">
                  {collection.pendingCount || 0}
                </h3>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-warning text-center">
              <div className="card-body py-2">
                <h6 className="text-muted mb-1">🔶 Partial (paid some)</h6>
                <h3 className="fw-bold text-warning">
                  {collection.partialCount || 0}
                </h3>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-danger text-center">
              <div className="card-body py-2">
                <h6 className="text-muted mb-1">💸 Total Balance Due</h6>
                <h3 className="fw-bold text-danger">
                  ₹{(collection.totalBalance || 0).toLocaleString("en-IN")}
                </h3>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Summary Cards ─────────────────────────────────────── */}
      <div className="row g-4 mb-4">
        {/* Students */}
        <div className="col-md-3">
          <div className="card dashboard-card border-0 h-100">
            <div className="card-body text-center">
              <FaUsers size={36} className="text-primary mb-3" />
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

        {/* Seats */}
        <div className="col-md-3">
          <div className="card dashboard-card border-0 h-100">
            <div className="card-body text-center">
              <FaChair size={36} className="text-success mb-3" />
              <h5 className="fw-bold">Seats</h5>
              <div className="row mt-3">
                <div className="col">
                  <h3 className="text-success">
                    {seats.vacantSeats || 0}
                  </h3>
                  <small className="text-muted">Vacant</small>
                </div>
                <div className="col">
                  <h3 className="text-danger">
                    {seats.occupiedSeats || 0}
                  </h3>
                  <small className="text-muted">Occupied</small>
                </div>
                <div className="col">
                  <h3 className="text-primary">
                    {seats.totalSeats || 0}
                  </h3>
                  <small className="text-muted">Total</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* This Month Collection */}
        <div className="col-md-3">
          <div className="card dashboard-card border-0 h-100">
            <div className="card-body text-center">
              <FaRupeeSign size={36} className="text-warning mb-3" />
              <h5 className="fw-bold">This Month</h5>
              <div className="row mt-3">
                <div className="col">
                  <h3 className="text-success">
                    ₹{(collection.totalCollected || 0).toLocaleString("en-IN")}
                  </h3>
                  <small className="text-muted">Collected</small>
                </div>
                <div className="col">
                  <h3 className="text-danger">
                    ₹{(collection.totalBalance || 0).toLocaleString("en-IN")}
                  </h3>
                  <small className="text-muted">Pending</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* No Fee Record */}
        <div className="col-md-3">
          <div className="card dashboard-card border-0 h-100">
            <div className="card-body text-center">
              <FaQuestionCircle
                size={36}
                className={`mb-3 ${noFeeRecord > 0 ? "text-danger" : "text-success"}`}
              />
              <h5 className="fw-bold">No Fee Record</h5>
              <h3
                className={`mt-3 fw-bold ${
                  noFeeRecord > 0 ? "text-danger" : "text-success"
                }`}
              >
                {noFeeRecord}
              </h3>
              <small className="text-muted">
                {noFeeRecord > 0
                  ? "Students not yet locked"
                  : "All students have records"}
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Charts ────────────────────────────────────────────── */}
      <div className="row g-4 mb-4">
        {/* Monthly Bar Chart */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h6 className="fw-bold mb-3">
                📈 Monthly Collection — Last 6 Months
              </h6>
              {monthlyTrend.every((m) => m.collection === 0) ? (
                <p className="text-muted text-center mt-5">
                  No collection data available yet
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={monthlyTrend}
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                  >
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis
                      tickFormatter={(v) =>
                        v >= 1000
                          ? `₹${(v / 1000).toFixed(0)}k`
                          : `₹${v}`
                      }
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(v) => [
                        `₹${v.toLocaleString("en-IN")}`,
                        "Collected",
                      ]}
                    />
                    <Bar
                      dataKey="collection"
                      fill="#0d6efd"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Seat Occupancy Donut */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h6 className="fw-bold mb-1">🪑 Seat Occupancy</h6>
              {(seats.totalSeats || 0) === 0 ? (
                <p className="text-muted text-center mt-5">No seat data</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={210}>
                    <PieChart>
                      <Pie
                        data={seatPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        dataKey="value"
                      >
                        {seatPieData.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend iconSize={12} />
                    </PieChart>
                  </ResponsiveContainer>
                  <p className="text-center text-muted small">
                    {seats.occupiedSeats || 0} occupied out of{" "}
                    {seats.totalSeats || 65} total seats
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Payment Mode & Fee Status ─────────────────────────── */}
      <div className="row g-4">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h6 className="fw-bold mb-3">💵 Payment Mode Breakdown</h6>
              <div className="d-flex justify-content-between mb-2">
                <span>Cash Collected</span>
                <span className="fw-bold text-success">
                  ₹{(collection.cashCollected || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="d-flex justify-content-between">
                <span>Online Collected</span>
                <span className="fw-bold text-primary">
                  ₹{(collection.onlineCollected || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h6 className="fw-bold mb-3">
                📋 Fee Status — {MONTH_NAMES[currentMonth - 1]} {currentYear}
              </h6>
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
              <div className="d-flex justify-content-between mb-2">
                <span>⏳ Pending</span>
                <span className="badge badge-pending px-3 py-2">
                  {collection.pendingCount || 0}
                </span>
              </div>
              <div className="d-flex justify-content-between border-top pt-2 mt-1">
                <span>❓ No Record</span>
                <span
                  className={`badge px-3 py-2 ${
                    noFeeRecord > 0 ? "bg-secondary" : "bg-success"
                  }`}
                >
                  {noFeeRecord}
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
