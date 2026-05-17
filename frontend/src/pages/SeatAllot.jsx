import { useState } from "react";
import API, {
  allotSeat,
  getStudentBookings,
  cancelBooking,
  searchStudents,
  getVacantSeats,
} from "../services/api";
import { toast } from "react-toastify";

function SeatAllot() {
  const [form, setForm] = useState({
    seatNo: "",
    regNo: "",
    startTime: "",
    endTime: "",
  });
  const [studentInfo, setStudentInfo] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isStudentSelected, setIsStudentSelected] = useState(false);

  // Inline vacant seat finder
  const [vacantSeats, setVacantSeats] = useState(null);
  const [vacantLoading, setVacantLoading] = useState(false);
  const [selectedVacantSeat, setSelectedVacantSeat] = useState(null);

  // Student bookings section
  const [searchRegNo, setSearchRegNo] = useState("");
  const [bookings, setBookings] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Student search
  const [studentSearchType, setStudentSearchType] = useState("name");
  const [studentSearchValue, setStudentSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);

  const handleFetchStudent = async () => {
    if (!form.regNo) {
      toast.error("Enter Reg No first");
      return;
    }
    try {
      const res = await API.get(`/seats/student/${form.regNo}`);
      setStudentInfo(res.data);

      const stuRes = await searchStudents("regno", form.regNo);
      const student = stuRes.data[0];
      if (student && student.inTime && student.outTime) {
        setForm((prev) => ({
          ...prev,
          startTime: student.inTime,
          endTime: student.outTime,
        }));
        toast.success(
          `Time auto-filled: ${student.inTime} - ${student.outTime}`,
        );
      } else {
        toast.info("Student found but no preferred time set. Enter manually.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Student not found");
      setStudentInfo(null);
    }
  };

  const handleStudentSearch = async (e) => {
    e.preventDefault();
    if (!studentSearchValue.trim()) {
      toast.error("Enter search value");
      return;
    }
    setStudentSearchLoading(true);
    setSearchResults(null);
    try {
      const res = await searchStudents(
        studentSearchType,
        studentSearchValue.trim(),
      );
      setSearchResults(res.data);
      if (res.data.length === 0) toast.info("No active students found");
    } catch (err) {
      toast.error(err.response?.data?.message || "Search failed");
    } finally {
      setStudentSearchLoading(false);
    }
  };

  const handleSelectStudent = (student) => {
    setForm({
      seatNo: "",
      regNo: student.regNo.toString(),
      startTime: student.inTime || "",
      endTime: student.outTime || "",
    });
    setStudentInfo({
      studentName: student.name,
      gender: student.gender,
      isActive: student.isActive,
    });
    setIsStudentSelected(true);
    setSearchResults(null);
    setStudentSearchValue("");
    setVacantSeats(null);
    setSelectedVacantSeat(null);
    setResult(null);

    if (student.inTime && student.outTime) {
      toast.success(
        `Selected: ${student.name} | Time: ${student.inTime} - ${student.outTime}`,
      );
    } else {
      toast.info(
        `Selected: ${student.name} | No preferred time set. Enter manually.`,
      );
    }
  };

  const handleFindVacantSeats = async () => {
    if (!studentInfo?.gender) {
      toast.error("Select a student first");
      return;
    }
    if (!form.startTime || !form.endTime) {
      toast.error("Set Start Time and End Time first");
      return;
    }
    setVacantLoading(true);
    setVacantSeats(null);
    setSelectedVacantSeat(null);
    try {
      const res = await getVacantSeats({
        gender: studentInfo.gender,
        inTime: form.startTime,
        outTime: form.endTime,
      });
      setVacantSeats(res.data);
      if (res.data.totalVacant === 0) {
        toast.info("No vacant seats for this student's slot");
      } else {
        toast.success(
          `${res.data.totalVacant} vacant seat(s) — click to select`,
        );
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to fetch vacant seats",
      );
    } finally {
      setVacantLoading(false);
    }
  };

  const handlePickSeat = (seat) => {
    setSelectedVacantSeat(seat);
    setForm((prev) => ({ ...prev, seatNo: seat.seatNo.toString() }));
    toast.info(`Seat ${seat.seatNo} (${seat.zone}) selected`);
  };

  const getZoneColor = (zone) => {
    if (zone === "BOYS_ONLY") return "#0d6efd";
    if (zone === "GIRLS_ONLY") return "#e91e8c";
    return "#198754";
  };

  const handleAllot = async (e) => {
    e.preventDefault();
    const seatNum = Number(form.seatNo);
    if (!form.seatNo || seatNum < 1 || seatNum > 65) {
      toast.error("Seat No must be between 1 and 65");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const payload = {
        seatNo: seatNum,
        regNo: Number(form.regNo),
        startTime: form.startTime,
        endTime: form.endTime,
      };
      const res = await allotSeat(payload);
      setResult(res.data);
      toast.success(res.data.message);
      // Keep student selected — only clear seat-related state
      setForm((prev) => ({ ...prev, seatNo: "" }));
      setVacantSeats(null);
      setSelectedVacantSeat(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to allot seat");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchBookings = async (e) => {
    e.preventDefault();
    setSearchLoading(true);
    setBookings(null);
    try {
      const res = await getStudentBookings(searchRegNo);
      setBookings(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Not found");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleCancel = async (bookingId) => {
    if (!window.confirm("Cancel this booking?")) return;
    try {
      const res = await cancelBooking(bookingId);
      toast.success(res.data.message);
      if (searchRegNo) {
        const res2 = await getStudentBookings(searchRegNo);
        setBookings(res2.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Cancel failed");
    }
  };

  return (
    <div>
      <h2 className="page-title">🪑 Allot Seat to Student</h2>

      {/* ─── FIND STUDENT ─────────────────────────────────── */}
      <div className="form-section col-lg-8 mb-4">
        <h5 className="fw-bold mb-2">🔍 Find Student</h5>
        <p className="text-muted small mb-3">
          Search active students by Reg No, Mobile No, or Name.
        </p>
        <form onSubmit={handleStudentSearch} className="row g-2 mb-3">
          <div className="col-md-3">
            <select
              className="form-select"
              value={studentSearchType}
              onChange={(e) => {
                setStudentSearchType(e.target.value);
                setStudentSearchValue("");
                setSearchResults(null);
              }}
            >
              <option value="name">Name</option>
              <option value="regNo">Reg No</option>
              <option value="mobile">Mobile No</option>
            </select>
          </div>
          <div className="col-md-6">
            <input
              type={studentSearchType === "regNo" ? "number" : "text"}
              className="form-control"
              placeholder={
                studentSearchType === "regNo"
                  ? "Enter Reg No..."
                  : studentSearchType === "mobile"
                    ? "Enter mobile number..."
                    : "Type partial student name..."
              }
              value={studentSearchValue}
              onChange={(e) => setStudentSearchValue(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <button
              type="submit"
              className="btn btn-outline-primary w-100"
              disabled={studentSearchLoading}
            >
              {studentSearchLoading ? "..." : "🔍 Search"}
            </button>
          </div>
        </form>

        {searchResults && searchResults.length > 0 && (
          <div className="table-responsive">
            <table className="table table-sm table-hover">
              <thead className="table-dark">
                <tr>
                  <th>RegNo</th>
                  <th>Name</th>
                  <th>Father</th>
                  <th>Mobile</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {searchResults.map((s) => (
                  <tr key={s.regNo}>
                    <td className="fw-bold">{s.regNo}</td>
                    <td>{s.name}</td>
                    <td>{s.fatherName || "-"}</td>
                    <td>{s.mobile}</td>
                    <td>
                      {s.inTime && s.outTime ? (
                        `${s.inTime} - ${s.outTime}`
                      ) : (
                        <span className="text-muted">Not set</span>
                      )}
                    </td>
                    <td>
                      {s.isActive ? (
                        <span className="badge bg-success">Active</span>
                      ) : (
                        <span className="badge bg-danger">Inactive</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => handleSelectStudent(s)}
                      >
                        ✅ Select
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── ALLOT FORM ───────────────────────────────────── */}
      <div className="form-section col-lg-8 mb-4">
        <h5 className="fw-bold mb-3">📌 Allot New Seat</h5>
        <form onSubmit={handleAllot}>
          <div className="row g-3">
            {/* Reg No */}
            <div className="col-md-3">
              <label className="form-label fw-bold">Reg No *</label>
              <div className="input-group">
                <input
                  type="number"
                  className="form-control"
                  value={form.regNo}
                  onChange={(e) => setForm({ ...form, regNo: e.target.value })}
                  disabled={isStudentSelected}
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleFetchStudent}
                  disabled={isStudentSelected}
                >
                  🔍
                </button>
              </div>
              <small className="text-muted">
                Enter & click 🔍 to auto-fill time
              </small>
              {isStudentSelected && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-warning mt-2"
                  onClick={() => {
                    setIsStudentSelected(false);
                    setForm({
                      seatNo: "",
                      regNo: "",
                      startTime: "",
                      endTime: "",
                    });
                    setStudentInfo(null);
                    setResult(null);
                    setVacantSeats(null);
                    setSelectedVacantSeat(null);
                  }}
                >
                  Change Student
                </button>
              )}
            </div>

            {/* Seat No */}
            <div className="col-md-3">
              <label className="form-label fw-bold">Seat No (1-65) *</label>
              <input
                type="number"
                className="form-control"
                min="1"
                max="65"
                value={form.seatNo}
                onChange={(e) => {
                  setForm({ ...form, seatNo: e.target.value });
                  setSelectedVacantSeat(null);
                }}
                required
              />
              {form.seatNo &&
                (Number(form.seatNo) < 1 || Number(form.seatNo) > 65) && (
                  <small className="text-danger">
                    Must be between 1 and 65
                  </small>
                )}
              {selectedVacantSeat && (
                <small className="text-success">
                  ✅ Seat {selectedVacantSeat.seatNo} ({selectedVacantSeat.zone}
                  )
                </small>
              )}
            </div>

            {/* Start Time */}
            <div className="col-md-3">
              <label className="form-label fw-bold">Start Time *</label>
              <input
                type="time"
                className="form-control"
                value={form.startTime}
                onChange={(e) => {
                  setForm({ ...form, startTime: e.target.value });
                  setVacantSeats(null);
                }}
                required
              />
              {form.startTime && (
                <small className="text-success">✅ {form.startTime}</small>
              )}
            </div>

            {/* End Time */}
            <div className="col-md-3">
              <label className="form-label fw-bold">End Time *</label>
              <input
                type="time"
                className="form-control"
                value={form.endTime}
                onChange={(e) => {
                  setForm({ ...form, endTime: e.target.value });
                  setVacantSeats(null);
                }}
                required
              />
              {form.endTime && (
                <small className="text-success">✅ {form.endTime}</small>
              )}
            </div>

            {/* Student info banner */}
            {studentInfo && (
              <div className="col-12">
                <div className="alert alert-info py-2 mb-0">
                  👤 <strong>{studentInfo.studentName}</strong>
                  {studentInfo.gender && ` | ${studentInfo.gender}`}
                  {studentInfo.isActive !== undefined &&
                    ` | ${studentInfo.isActive ? "✅ Active" : "❌ Inactive"}`}
                  {studentInfo.totalBookings !== undefined &&
                    ` | Existing Bookings: ${studentInfo.totalBookings}`}
                </div>
              </div>
            )}

            {/* Find Vacant Seats — shown once student + times are ready */}
            {studentInfo && form.startTime && form.endTime && (
              <div className="col-12">
                <button
                  type="button"
                  className="btn btn-outline-success"
                  onClick={handleFindVacantSeats}
                  disabled={vacantLoading}
                >
                  {vacantLoading
                    ? "Searching..."
                    : "🟢 Find Vacant Seats for This Slot"}
                </button>
              </div>
            )}

            {/* Inline vacant seat grid */}
            {vacantSeats && (
              <div className="col-12">
                {vacantSeats.totalVacant === 0 ? (
                  <div className="alert alert-warning py-2 mb-0">
                    ❌ No vacant seats for {studentInfo?.gender} in slot{" "}
                    {form.startTime} – {form.endTime}
                  </div>
                ) : (
                  <div>
                    <p className="text-muted small mb-2">
                      {vacantSeats.totalVacant} vacant seat(s) — click one to
                      select:
                    </p>
                    <div className="d-flex flex-wrap gap-2">
                      {vacantSeats.vacantSeats.map((seat) => (
                        <div
                          key={seat.seatNo}
                          onClick={() => handlePickSeat(seat)}
                          style={{
                            width: 60,
                            height: 60,
                            backgroundColor: getZoneColor(seat.zone),
                            color: "white",
                            borderRadius: 8,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "bold",
                            fontSize: 14,
                            cursor: "pointer",
                            border:
                              selectedVacantSeat?.seatNo === seat.seatNo
                                ? "3px solid #ffc107"
                                : "2px solid transparent",
                            opacity:
                              selectedVacantSeat?.seatNo === seat.seatNo
                                ? 1
                                : 0.8,
                          }}
                        >
                          <span>{seat.seatNo}</span>
                          <span style={{ fontSize: 8 }}>{seat.zone}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="col-12">
              <button
                type="submit"
                className="btn btn-success px-4"
                disabled={loading}
              >
                {loading ? "Allotting..." : "✅ Allot Seat"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ─── ALLOT RESULT ─────────────────────────────────── */}
      {result && (
        <div className="result-card success mb-4">
          <h5 className="fw-bold">✅ {result.message}</h5>
          <table className="table table-sm mt-3">
            <tbody>
              <tr>
                <td>Booking ID</td>
                <td className="fw-bold">{result.bookingId}</td>
              </tr>
              <tr>
                <td>Seat No</td>
                <td className="fw-bold">
                  {result.seatNo} ({result.zone})
                </td>
              </tr>
              <tr>
                <td>Student</td>
                <td>
                  {result.studentName} (RegNo: {result.regNo})
                </td>
              </tr>
              <tr>
                <td>Gender</td>
                <td>{result.gender}</td>
              </tr>
              <tr>
                <td>Time Slot</td>
                <td className="fw-bold text-primary">{result.timeSlot}</td>
              </tr>
              <tr>
                <td>Booking Date</td>
                <td>{result.bookingDate}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <hr className="my-4" />

      {/* ─── VIEW / CANCEL BOOKINGS ───────────────────────── */}
      <h5 className="fw-bold mb-3">📋 View / Cancel Student Bookings</h5>
      <div className="form-section col-lg-5 mb-4">
        <form onSubmit={handleSearchBookings} className="d-flex gap-2">
          <input
            type="number"
            className="form-control"
            placeholder="Enter Reg No"
            value={searchRegNo}
            onChange={(e) => setSearchRegNo(e.target.value)}
            required
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={searchLoading}
          >
            {searchLoading ? "..." : "🔍 Search"}
          </button>
        </form>
      </div>

      {bookings && (
        <div>
          <div className="result-card mb-3">
            <h6 className="fw-bold">
              {bookings.studentName} (Reg: {bookings.regNo}) — {bookings.gender}
            </h6>
            <p>
              Status: {bookings.isActive ? "✅ Active" : "❌ Inactive"} | Total
              Bookings: {bookings.totalBookings}
            </p>
          </div>
          {bookings.totalBookings === 0 ? (
            <div className="alert alert-info">
              No bookings found for this student.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-custom table-hover">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Seat No</th>
                    <th>Zone</th>
                    <th>Time Slot</th>
                    <th>Booking Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.bookings.map((b) => (
                    <tr key={b.bookingId}>
                      <td className="fw-bold">{b.bookingId}</td>
                      <td className="fw-bold">{b.seatNo}</td>
                      <td>
                        <span
                          className={`badge ${
                            b.zone === "BOYS_ONLY"
                              ? "bg-primary"
                              : b.zone === "GIRLS_ONLY"
                                ? "bg-danger"
                                : "bg-success"
                          }`}
                        >
                          {b.zone}
                        </span>
                      </td>
                      <td>{b.timeSlot}</td>
                      <td>{b.bookingDate}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleCancel(b.bookingId)}
                        >
                          ❌ Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SeatAllot;
