import { useState } from "react";
import { getVacantSeats, changeSeat } from "../services/api";
import { toast } from "react-toastify";

// step: 1=info, 2=selecting seat, 3=confirming
export default function ChangeSeatModal({ student, onClose, onSaved }) {
  const [step,         setStep]         = useState(1);
  const [vacantSeats,  setVacantSeats]  = useState([]);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [saving,       setSaving]       = useState(false);

  const hasCurrentSeat = student.seatNo > 0;

  // Parse "11:00 - 17:00" → ["11:00", "17:00"]
  const [inTime, outTime] = student.timeSlot
    ? student.timeSlot.split(" - ")
    : [null, null];

  // ── Step 1 → Step 2: fetch vacant seats ──────────────
  const handleFindSeats = async () => {
    setLoadingSeats(true);
    try {
      const res = await getVacantSeats({
        gender:  student.gender,
        inTime:  inTime,
        outTime: outTime,
      });
      // Exclude current seat — student doesn't need to see their own seat
      const filtered = (res.data.vacantSeats || []).filter(
        (s) => s.seatNo !== student.seatNo
      );
      setVacantSeats(filtered);
      setStep(2);
      if (filtered.length === 0) {
        toast.info("No other seats available for this time slot.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch available seats");
    } finally {
      setLoadingSeats(false);
    }
  };

  // ── Step 2 → Step 3: user picks a seat ───────────────
  const handleSelectSeat = (seat) => {
    setSelectedSeat(seat);
    setStep(3);
  };

  // ── Step 3: confirm the change ────────────────────────
  const handleConfirm = async () => {
    setSaving(true);
    try {
      const res = await changeSeat({
        regNo:    student.regNo,
        newSeatNo: selectedSeat.seatNo,
      });
      toast.success(res.data.message);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change seat");
    } finally {
      setSaving(false);
    }
  };

  const seatBox = (num, color, label) => (
    <div
      style={{
        width: 72, height: 72, backgroundColor: color, borderRadius: 12,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", color: "white", fontWeight: "bold",
        fontSize: 22, margin: "0 auto",
      }}
    >
      {num}
      {label && <span style={{ fontSize: 9, marginTop: 2, opacity: 0.9 }}>{label}</span>}
    </div>
  );

  return (
    <>
      <div className="modal-backdrop fade show" onClick={!saving ? onClose : undefined} />
      <div className="modal fade show d-block" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">

            {/* Header */}
            <div className="modal-header">
              <h5 className="modal-title fw-bold">
                🔄 Change Seat — {student.name}{" "}
                <span className="text-muted fw-normal fs-6">(Reg #{student.regNo})</span>
              </h5>
              <button type="button" className="btn-close" onClick={onClose} disabled={saving} />
            </div>

            <div className="modal-body">

              {/* ── Current Info Cards (always visible) ── */}
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <div className="border rounded p-3 text-center">
                    <div className="text-muted small mb-1">Current Seat</div>
                    <div className="fw-bold fs-3">
                      {hasCurrentSeat
                        ? <span className="badge bg-danger fs-5 px-3">🪑 {student.seatNo}</span>
                        : <span className="text-muted">—</span>}
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="border rounded p-3 text-center">
                    <div className="text-muted small mb-1">Time Slot</div>
                    <div className="fw-bold">
                      <span className="badge bg-success fs-6">{student.timeSlot || "—"}</span>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="border rounded p-3 text-center">
                    <div className="text-muted small mb-1">Gender</div>
                    <div className="fw-bold">
                      <span className={`badge fs-6 ${student.gender === "Male" ? "bg-primary" : "bg-danger"}`}>
                        {student.gender}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── No seat: block feature ── */}
              {!hasCurrentSeat && (
                <div className="alert alert-warning mb-0">
                  ⚠️ <strong>{student.name}</strong> has no active seat booking.
                  Use <strong>Allot Seat</strong> to assign a seat first.
                </div>
              )}

              {/* ── STEP 2: Vacant Seat Grid ── */}
              {step >= 2 && hasCurrentSeat && (
                <div className="mb-2">
                  <hr />
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold mb-0">
                      📍 Available Seats for{" "}
                      <span className="text-primary">{student.timeSlot}</span>
                      <span className="badge bg-success ms-2">{vacantSeats.length} available</span>
                    </h6>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => { setStep(1); setSelectedSeat(null); setVacantSeats([]); }}
                    >
                      ← Back
                    </button>
                  </div>

                  {vacantSeats.length === 0 ? (
                    <div className="alert alert-info">
                      No other seats available for <strong>{student.timeSlot}</strong>.
                      All seats matching this time slot are occupied.
                    </div>
                  ) : (
                    <>
                      <p className="text-muted small mb-3">
                        Click any seat below to select it.{" "}
                        <strong>Seat {student.seatNo}</strong> (current) is excluded from this list.
                      </p>
                      <div className="d-flex flex-wrap gap-2">
                        {vacantSeats.map((seat) => {
                          const isSelected = selectedSeat?.seatNo === seat.seatNo;
                          return (
                            <div
                              key={seat.seatNo}
                              onClick={() => handleSelectSeat(seat)}
                              title={`Seat ${seat.seatNo} — ${seat.zone}`}
                              style={{
                                width: 56, height: 56,
                                backgroundColor: isSelected ? "#ffc107" : "#198754",
                                color: "white",
                                borderRadius: 8,
                                display: "flex", flexDirection: "column",
                                alignItems: "center", justifyContent: "center",
                                cursor: "pointer", fontWeight: "bold", fontSize: 15,
                                border: isSelected
                                  ? "3px solid #e6a800"
                                  : "2px solid transparent",
                                transform: isSelected ? "scale(1.1)" : "scale(1)",
                                transition: "all 0.15s ease",
                              }}
                            >
                              {seat.seatNo}
                              <span style={{ fontSize: 8, opacity: 0.85 }}>
                                {(seat.zone || "").slice(0, 5)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── STEP 3: Confirmation ── */}
              {step === 3 && selectedSeat && (
                <>
                  <hr />
                  <div className="alert alert-warning border-2 mt-2">
                    <h6 className="fw-bold mb-3">⚠️ Confirm Seat Change</h6>

                    {/* Visual: old seat → new seat */}
                    <div className="d-flex align-items-center gap-3 mb-4 flex-wrap">
                      <div className="text-center">
                        <div className="text-muted small mb-1 fw-semibold">CURRENT SEAT</div>
                        {seatBox(student.seatNo, "#dc3545", "current")}
                      </div>

                      <div className="display-6 text-muted px-2">→</div>

                      <div className="text-center">
                        <div className="text-muted small mb-1 fw-semibold">NEW SEAT</div>
                        {seatBox(selectedSeat.seatNo, "#198754", selectedSeat.zone?.slice(0,6))}
                      </div>

                      <div className="ms-3 border-start ps-3">
                        <div className="mb-1">
                          <span className="text-muted small">Student:</span>{" "}
                          <strong>{student.name}</strong>
                        </div>
                        <div className="mb-1">
                          <span className="text-muted small">Time Slot:</span>{" "}
                          <strong>{student.timeSlot}</strong>
                        </div>
                        <div className="mb-1">
                          <span className="text-muted small">New Zone:</span>{" "}
                          <strong>{selectedSeat.zone}</strong>
                        </div>
                        <div className="text-muted small mt-2">
                          ✅ Timing, fee, and fee config remain unchanged.
                        </div>
                      </div>
                    </div>

                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-secondary"
                        onClick={() => { setStep(2); setSelectedSeat(null); }}
                        disabled={saving}
                      >
                        ← Choose Different Seat
                      </button>
                      <button
                        className="btn btn-warning fw-bold px-4"
                        onClick={handleConfirm}
                        disabled={saving}
                      >
                        {saving
                          ? <><span className="spinner-border spinner-border-sm me-2" />Changing Seat...</>
                          : `✅ Confirm: Move to Seat ${selectedSeat.seatNo}`}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer">
              {step === 1 && hasCurrentSeat && (
                <button
                  className="btn btn-primary px-4"
                  onClick={handleFindSeats}
                  disabled={loadingSeats}
                >
                  {loadingSeats
                    ? <><span className="spinner-border spinner-border-sm me-2" />Finding Seats...</>
                    : "🔍 Find Available Seats"}
                </button>
              )}
              <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
                Close
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
