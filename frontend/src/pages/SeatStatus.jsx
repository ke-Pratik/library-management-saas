import { useState, useEffect, useMemo } from "react";
import { getSeatStatus, cancelBooking } from "../services/api";
import { toast } from "react-toastify";

/**
 * Seat Status Dashboard.
 * Zones, ranges, and colors are derived from the tenant's configured
 * `tenant_seat_zones` (returned by the backend in seatData.zones) — no
 * hardcoded ranges like Boys 1-17 / Girls 18-30 / Common 31-65.
 */

// Color palette. We pick a color per zone based on its allowedGender, falling
// back to a rotating palette for custom zones beyond the standard three.
const COLOR_MALE = "#0d6efd";    // blue
const COLOR_FEMALE = "#e91e8c";  // pink
const COLOR_ANY = "#198754";     // green (common)
const COLOR_OCCUPIED = "#dc3545"; // red
const FALLBACK_PALETTE = ["#6610f2", "#fd7e14", "#20c997", "#0dcaf0", "#6f42c1"];

function colorForZone(zone, fallbackIndex = 0) {
  if (!zone) return COLOR_ANY;
  const g = zone.allowedGender;
  if (g === "Male") return COLOR_MALE;
  if (g === "Female") return COLOR_FEMALE;
  if (g === null || g === undefined || g === "") return COLOR_ANY;
  return FALLBACK_PALETTE[fallbackIndex % FALLBACK_PALETTE.length];
}

function SeatStatus() {
  const [seatData, setSeatData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [zoneFilter, setZoneFilter] = useState("ALL");

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await getSeatStatus();
      setSeatData(res.data);
    } catch (err) {
      toast.error("Failed to load seat status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSeatClick = (seat) => setSelectedSeat(seat);

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("Cancel this booking?")) return;
    try {
      const res = await cancelBooking(bookingId);
      toast.success(res.data.message);
      await fetchStatus();
      setSelectedSeat(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Cancel failed");
    }
  };

  // Build a zoneName → color mapping from the tenant's zones, computed once per data load.
  const zoneColorMap = useMemo(() => {
    const map = {};
    const zones = seatData?.zones || [];
    zones.forEach((z, idx) => {
      map[z.zoneName] = colorForZone(z, idx);
    });
    return map;
  }, [seatData?.zones]);

  const getSeatColor = (seat) => {
    if (seat.status === "OCCUPIED") return COLOR_OCCUPIED;
    return zoneColorMap[seat.zone] || COLOR_ANY;
  };

  const filteredSeats = seatData?.seats?.filter((s) => {
    if (zoneFilter === "ALL") return true;
    return s.zone === zoneFilter;
  });

  if (loading)
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-primary"></div>
      </div>
    );
  if (!seatData)
    return <div className="alert alert-danger">Failed to load seat data</div>;

  const zones = seatData.zones || [];

  return (
    <div>
      <h2 className="page-title">📊 Seat Status Dashboard</h2>

      {/* Summary */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card text-center border-primary">
            <div className="card-body">
              <h6 className="text-muted">Total Seats</h6>
              <h2 className="fw-bold text-primary">{seatData.totalSeats}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card text-center border-danger">
            <div className="card-body">
              <h6 className="text-muted">Occupied</h6>
              <h2 className="fw-bold text-danger">{seatData.occupiedSeats}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card text-center border-success">
            <div className="card-body">
              <h6 className="text-muted">Vacant</h6>
              <h2 className="fw-bold text-success">{seatData.vacantSeats}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Legend — built dynamically from tenant zone config */}
      <div className="d-flex gap-3 mb-3 flex-wrap">
        {zones.map((z, idx) => (
          <span key={z.zoneName}>
            <span
              style={{
                display: "inline-block",
                width: 16,
                height: 16,
                backgroundColor: colorForZone(z, idx),
                borderRadius: 3,
                marginRight: 5,
              }}
            />
            {z.zoneName} ({z.startSeat}–{z.endSeat})
          </span>
        ))}
        <span>
          <span
            style={{
              display: "inline-block",
              width: 16,
              height: 16,
              backgroundColor: COLOR_OCCUPIED,
              borderRadius: 3,
              marginRight: 5,
            }}
          />
          Occupied
        </span>
      </div>

      {/* Zone filter — built dynamically from tenant zone config */}
      <div className="d-flex gap-2 mb-3 flex-wrap">
        <button
          className={`btn btn-sm ${zoneFilter === "ALL" ? "btn-dark" : "btn-outline-secondary"}`}
          onClick={() => {
            setZoneFilter("ALL");
            setSelectedSeat(null);
          }}
        >
          All Seats
        </button>
        {zones.map((z) => (
          <button
            key={z.zoneName}
            className={`btn btn-sm ${zoneFilter === z.zoneName ? "btn-dark" : "btn-outline-secondary"}`}
            onClick={() => {
              setZoneFilter(z.zoneName);
              setSelectedSeat(null);
            }}
          >
            {z.zoneName} ({z.startSeat}–{z.endSeat})
          </button>
        ))}
      </div>

      {/* Seat Grid */}
      <div className="d-flex flex-wrap gap-2 mb-4">
        {filteredSeats &&
          filteredSeats.map((seat) => (
            <div
              key={seat.seatNo}
              onClick={() => handleSeatClick(seat)}
              style={{
                width: 52,
                height: 52,
                backgroundColor: getSeatColor(seat),
                color: "white",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: 14,
                opacity: seat.status === "OCCUPIED" ? 1 : 0.7,
                border:
                  selectedSeat && selectedSeat.seatNo === seat.seatNo
                    ? "3px solid #ffc107"
                    : "2px solid transparent",
              }}
            >
              {seat.seatNo}
            </div>
          ))}
      </div>

      {/* Selected Seat Detail */}
      {selectedSeat && (
        <div className="form-section col-lg-8">
          <h5 className="fw-bold mb-3">
            🪑 Seat {selectedSeat.seatNo} — {selectedSeat.zone}
            <span
              className={`badge ms-2 ${selectedSeat.status === "OCCUPIED" ? "bg-danger" : "bg-success"}`}
            >
              {selectedSeat.status}
            </span>
          </h5>

          {selectedSeat.status === "VACANT" ? (
            <p className="text-success fw-bold">
              ✅ This seat is available for booking
            </p>
          ) : (
            <div>
              <p className="text-muted mb-2">Current bookings on this seat:</p>
              <table className="table table-sm table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>Booking ID</th>
                    <th>RegNo</th>
                    <th>Student</th>
                    <th>Gender</th>
                    <th>Time Slot</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSeat.bookings &&
                    selectedSeat.bookings.map((b) => (
                      <tr key={b.bookingId}>
                        <td>{b.bookingId}</td>
                        <td className="fw-bold">{b.regNo}</td>
                        <td>{b.studentName}</td>
                        <td>
                          <span
                            className={`badge ${b.gender === "Male" ? "bg-primary" : "bg-danger"}`}
                          >
                            {b.gender}
                          </span>
                        </td>
                        <td>{b.timeSlot}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleCancelBooking(b.bookingId)}
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

export default SeatStatus;
