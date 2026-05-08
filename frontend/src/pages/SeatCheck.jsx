import { useState } from "react";
import { checkSeatAvailability } from "../services/api";
import { toast } from "react-toastify";

function SeatCheck() {
  const [form, setForm] = useState({
    seatNo: "",
    gender: "Male",
    inTime: "07:00",
    outTime: "12:00",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const payload = {
        gender: form.gender,
        inTime: form.inTime,
        outTime: form.outTime,
      };
      if (form.seatNo) {
        payload.seatNo = form.seatNo;
      }
      const res = await checkSeatAvailability(payload);
      setResult(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Error checking seat");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="page-title">🔍 Check Seat Availability</h2>
      <div className="form-section col-lg-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-bold">
              Seat No (1-65) Optional
            </label>
            <input
              type="number"
              className="form-control"
              min="1"
              max="65"
              value={form.seatNo}
              onChange={(e) => setForm({ ...form, seatNo: e.target.value })}
            />
          </div>
          <div className="mb-3">
            <label className="form-label fw-bold">Gender</label>
            <select
              className="form-select"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div className="row g-3 mb-3">
            <div className="col">
              <label className="form-label fw-bold">In Time</label>
              <input
                type="time"
                className="form-control"
                value={form.inTime}
                onChange={(e) => setForm({ ...form, inTime: e.target.value })}
                required
              />
            </div>
            <div className="col">
              <label className="form-label fw-bold">Out Time</label>
              <input
                type="time"
                className="form-control"
                value={form.outTime}
                onChange={(e) => setForm({ ...form, outTime: e.target.value })}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Checking..." : "🔍 Check Availability"}
          </button>
        </form>
      </div>
      {/* VACANT SEATS RESULT */}
      {result?.vacantSeats && (
        <div className="result-card mt-4 success">
          <h4 className="fw-bold mb-3">
            ✅ {result.totalVacant} Vacant Seats Found
          </h4>
          <p className="mb-4">
            <strong>Gender:</strong> {result.gender} | <strong>Slot:</strong>{" "}
            {result.requestedSlot}
          </p>

          <div className="d-flex flex-wrap gap-3">
            {result.vacantSeats.map((seat) => (
              <div
                key={seat.seatNo}
                className={`text-white text-center rounded p-3 fw-bold ${
                  seat.zone === "COMMON" ? "bg-success" : "bg-primary"
                }`}
                style={{
                  width: "90px",
                  minHeight: "75px",
                }}
              >
                <div style={{ fontSize: "20px" }}>{seat.seatNo}</div>

                <div style={{ fontSize: "10px" }}>{seat.zone}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* SINGLE SEAT RESULT */}
      {result && !result.vacantSeats && (
        <div
          className={`result-card mt-4 ${
            result.available
              ? "success"
              : result.status === "GENDER_NOT_ALLOWED"
                ? "warning"
                : "error"
          }`}
        >
          <h5 className="fw-bold">
            {result.available
              ? "✅ SEAT VACANT"
              : result.status === "GENDER_NOT_ALLOWED"
                ? "🚫 GENDER NOT ALLOWED"
                : "❌ SEAT NOT VACANT"}
          </h5>

          <p>
            <strong>Zone:</strong> {result.zone}
          </p>

          <p>
            <strong>Message:</strong> {result.message}
          </p>

          {/* OCCUPIED SEAT DETAILS */}
          {!result.available && result.status !== "GENDER_NOT_ALLOWED" && (
            <div className="mt-3">
              <table className="table table-sm table-bordered">
                <tbody>
                  <tr>
                    <td className="fw-bold">Student Name</td>
                    <td>{result.studentName || "-"}</td>
                  </tr>

                  <tr>
                    <td className="fw-bold">Reg No</td>
                    <td>{result.regNo || "-"}</td>
                  </tr>

                  <tr>
                    <td className="fw-bold">Occupied Time</td>
                    <td>{result.occupiedTimeSlot || "-"}</td>
                  </tr>

                  <tr>
                    <td className="fw-bold">Booking Date</td>
                    <td>{result.bookingDate || "-"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SeatCheck;
