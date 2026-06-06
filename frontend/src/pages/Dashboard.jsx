import { useState, useEffect } from "react";
import {
  getStudentSummary,
  getSeatStatus,
  getMonthlyCollection,
  getCollectionByRange,
} from "../services/api";
import { FaUsers, FaChair, FaQuestionCircle, FaCalendarDay } from "react-icons/fa";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const MONTH_NAMES   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const SEAT_COLORS    = ["#dc3545", "#198754"];
const PAYMENT_COLORS = ["#198754", "#0d6efd"];

const fmt = (n) => Number(n || 0).toLocaleString("en-IN");
const pad = (n) => String(n).padStart(2, "0");

function Dashboard() {
  const now          = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear  = now.getFullYear();
  // FIX: use LOCAL date (IST), not UTC. toISOString() returns UTC and
  // would roll back to the previous day between midnight and 5:30 AM IST.
  const todayStr     = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const [students,     setStudents]     = useState({});
  const [seats,        setSeats]        = useState({});
  const [collection,   setCollection]   = useState({});
  const [todayData,    setTodayData]    = useState({});
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [loading,      setLoading]      = useState(true);

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
        getCollectionByRange({ startDate: todayStr, endDate: todayStr }),
        ...months.map(({ month, year }) => getMonthlyCollection({ month, year })),
      ]);

      if (results[0].status === "fulfilled") setStudents(results[0].value.data);
      if (results[1].status === "fulfilled") setSeats(results[1].value.data);
      if (results[2].status === "fulfilled") setCollection(results[2].value.data);
      if (results[3].status === "fulfilled") setTodayData(results[3].value.data);

      const trend = months.map(({ month, year }, idx) => ({
        label:      `${MONTH_NAMES[month - 1]} '${String(year).slice(2)}`,
        collection: Number(results[idx + 4]?.value?.data?.totalCollected || 0),
      }));
      setMonthlyTrend(trend);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const studentsWithDues   = (collection.pendingCount || 0) + (collection.partialCount || 0);
  const studentsWithRecord = (collection.paidCount || 0) + (collection.partialCount || 0) + (collection.pendingCount || 0);
  const noFeeRecord        = Math.max(0, (students.activeStudents || 0) - studentsWithRecord);

  const seatPieData = [
    { name: "Occupied", value: seats.occupiedSeats || 0 },
    { name: "Vacant",   value: seats.vacantSeats   || 0 },
  ];
  const paymentPieData = [
    { name: "💵 Cash",   value: Number(collection.cashCollected   || 0) },
    { name: "💳 Online", value: Number(collection.onlineCollected || 0) },
  ];

  if (loading)
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-primary" />
        <p className="mt-2 text-muted">Loading dashboard...</p>
      </div>
    );

  return (
    <div>
      {/* ── Header ── */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="page-title mb-0">📊 Dashboard</h2>
        <button className="btn btn-outline-secondary btn-sm" onClick={fetchDashboard}>
          🔄 Refresh
        </button>
      </div>

      {/* ── Dues Alert ── */}
      {studentsWithDues > 0 && (
        <div className="alert alert-warning mb-4">
          ⚠️ <strong>{studentsWithDues} student(s)</strong> have pending or partial dues for{" "}
          <strong>{MONTH_NAMES[currentMonth - 1]} {currentYear}</strong> — collect fees from the Fee section.
        </div>
      )}

      {/* ── Row 1: Summary Cards ── */}
      <div className="row g-4 mb-4">

        {/* Students */}
        <div className="col-md-3">
          <div className="card dashboard-card border-0 h-100">
            <div className="card-body text-center">
              <FaUsers size={36} className="text-primary mb-3" />
              <h5 className="fw-bold">Students</h5>
              <div className="row mt-3">
                <div className="col">
                  <h3 className="text-success">{students.activeStudents || 0}</h3>
                  <small className="text-muted">Active</small>
                </div>
                <div className="col">
                  <h3 className="text-danger">{students.inactiveStudents || 0}</h3>
                  <small className="text-muted">Inactive</small>
                </div>
                <div className="col">
                  <h3 className="text-primary">{students.totalStudents || 0}</h3>
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
                  <h3 className="text-success">{seats.vacantSeats || 0}</h3>
                  <small className="text-muted">Vacant</small>
                </div>
                <div className="col">
                  <h3 className="text-danger">{seats.occupiedSeats || 0}</h3>
                  <small className="text-muted">Occupied</small>
                </div>
                <div className="col">
                  <h3 className="text-primary">{seats.totalSeats || 0}</h3>
                  <small className="text-muted">Total</small>
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
              <h3 className={`mt-3 fw-bold ${noFeeRecord > 0 ? "text-danger" : "text-success"}`}>
                {noFeeRecord}
              </h3>
              <small className="text-muted">
                {noFeeRecord > 0 ? "Students not yet locked" : "All students have records"}
              </small>
            </div>
          </div>
        </div>

        {/* TODAY */}
        <div className="col-md-3">
          <div className="card dashboard-card border-0 h-100">
            <div className="card-body text-center">
              <FaCalendarDay size={36} className="text-info mb-3" />
              <h5 className="fw-bold">Today</h5>
              <h3 className="text-success fw-bold mt-3">
                ₹{fmt(todayData.totalCollected)}
              </h3>
              <small className="text-muted">
                {todayData.totalStudents || 0} receipt(s) on {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </small>
              {Number(todayData.totalCollected || 0) > 0 && (
                <div className="mt-2 small">
                  <span className="text-success me-2">💵 ₹{fmt(todayData.cashCollected)}</span>
                  <span className="text-primary">💳 ₹{fmt(todayData.onlineCollected)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ── Row 2: This Month Financial Summary + Payment Mode Donut ── */}
      <div className="row g-4 mb-4">

        {/* This Month */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h6 className="fw-bold mb-3">
                💰 {MONTH_NAMES[currentMonth - 1]} {currentYear} — Financial Summary
              </h6>
              <div className="row g-3">

                {/* Billed */}
                <div className="col-md-4">
                  <div className="p-3 rounded bg-light text-center">
                    <div className="text-muted small mb-1">Billed This Month</div>
                    <div className="fw-bold fs-5">₹{fmt(collection.totalFeeExpected)}</div>
                    <div className="text-muted" style={{ fontSize: "11px" }}>
                      {collection.totalStudents || 0} students
                    </div>
                  </div>
                </div>

                {/* Cash Received */}
                <div className="col-md-4">
                  <div className="p-3 rounded bg-light text-center">
                    <div className="text-muted small mb-1">Cash Received</div>
                    <div className="fw-bold fs-5 text-success">
                      ₹{fmt(collection.totalCashReceived)}
                    </div>
                    {Number(collection.oldDuesRecovered || 0) > 0 && (
                      <div className="text-warning" style={{ fontSize: "11px" }}>
                        incl. ₹{fmt(collection.oldDuesRecovered)} from prev. months
                      </div>
                    )}
                  </div>
                </div>

                {/* Outstanding */}
                <div className="col-md-4">
                  <div className="p-3 rounded bg-light text-center">
                    <div className="text-muted small mb-1">Total Outstanding</div>
                    <div className={`fw-bold fs-5 ${Number(collection.totalOutstandingDues || 0) > 0 ? "text-danger" : "text-success"}`}>
                      ₹{fmt(collection.totalOutstandingDues)}
                    </div>
                    {Number(collection.priorMonthDues || 0) > 0 && (
                      <div className="text-danger" style={{ fontSize: "11px" }}>
                        incl. ₹{fmt(collection.priorMonthDues)} from prev. months
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Payment Mode Donut */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h6 className="fw-bold mb-1">💵 Payment Mode</h6>
              {Number(collection.totalCollected || 0) === 0 ? (
                <p className="text-muted text-center mt-4">No payments this month</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie
                        data={paymentPieData}
                        cx="50%" cy="50%"
                        innerRadius={45} outerRadius={70}
                        dataKey="value"
                      >
                        {paymentPieData.map((_, idx) => (
                          <Cell key={idx} fill={PAYMENT_COLORS[idx]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [`₹${v.toLocaleString("en-IN")}`, ""]} />
                      <Legend iconSize={12} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="d-flex justify-content-around text-center mt-1">
                    <div>
                      <div className="fw-bold text-success small">₹{fmt(collection.cashCollected)}</div>
                      <div style={{ fontSize: "11px" }} className="text-muted">Cash</div>
                    </div>
                    <div>
                      <div className="fw-bold text-primary small">₹{fmt(collection.onlineCollected)}</div>
                      <div style={{ fontSize: "11px" }} className="text-muted">Online</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ── Row 3: Charts ── */}
      <div className="row g-4 mb-4">

        {/* 6-month Bar Chart */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h6 className="fw-bold mb-3">📈 Monthly Collection — Last 6 Months</h6>
              {monthlyTrend.every((m) => m.collection === 0) ? (
                <p className="text-muted text-center mt-5">No collection data available yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthlyTrend} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis
                      tickFormatter={(v) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip formatter={(v) => [`₹${v.toLocaleString("en-IN")}`, "Collected"]} />
                    <Bar dataKey="collection" fill="#0d6efd" radius={[4, 4, 0, 0]} />
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
                        cx="50%" cy="50%"
                        innerRadius={55} outerRadius={85}
                        dataKey="value"
                      >
                        {seatPieData.map((_, idx) => (
                          <Cell key={idx} fill={SEAT_COLORS[idx]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend iconSize={12} />
                    </PieChart>
                  </ResponsiveContainer>
                  <p className="text-center text-muted small">
                    {seats.occupiedSeats || 0} occupied out of {seats.totalSeats || 65} total seats
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ── Row 4: Fee Status ── */}
      <div className="row g-4">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h6 className="fw-bold mb-3">
                📋 Fee Status — {MONTH_NAMES[currentMonth - 1]} {currentYear}
              </h6>
              <div className="d-flex justify-content-between mb-2">
                <span>✅ Paid</span>
                <span className="badge badge-paid px-3 py-2">{collection.paidCount || 0}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>🔶 Partial</span>
                <span className="badge badge-partial px-3 py-2">{collection.partialCount || 0}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>⏳ Pending</span>
                <span className="badge badge-pending px-3 py-2">{collection.pendingCount || 0}</span>
              </div>
              <div className="d-flex justify-content-between border-top pt-2 mt-1">
                <span>❓ No Record</span>
                <span className={`badge px-3 py-2 ${noFeeRecord > 0 ? "bg-secondary" : "bg-success"}`}>
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
