import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";

function Onboarding() {
  const navigate = useNavigate();
  const { setOnboarded } = useAuth();

  const [form, setForm] = useState({
    totalSeats:          "65",
    operatingHoursStart: "08:00",
    operatingHoursEnd:   "22:00",
    currencySymbol:      "INR",
    timezone:            "Asia/Kolkata",
    hourlyFee:           "",
  });

  const [zones, setZones] = useState([
    { zoneName: "BOYS_ONLY",  allowedGender: "Male",   startSeat: "1",  endSeat: "17" },
    { zoneName: "GIRLS_ONLY", allowedGender: "Female", startSeat: "18", endSeat: "30" },
    { zoneName: "COMMON",     allowedGender: "",       startSeat: "31", endSeat: "65" },
  ]);

  const [feeSlots, setFeeSlots] = useState([
    { inTime: "08:00", outTime: "14:00", feeAmount: "" },
    { inTime: "14:00", outTime: "22:00", feeAmount: "" },
  ]);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  // ── Zone helpers ──────────────────────────────────────────────────────
  const setZone    = (i, patch) => setZones((prev) => prev.map((z, idx) => idx === i ? { ...z, ...patch } : z));
  const addZone    = () => setZones([...zones, { zoneName: "", allowedGender: "", startSeat: "", endSeat: "" }]);
  const removeZone = (i) => setZones(zones.filter((_, idx) => idx !== i));

  // ── Fee slot helpers ──────────────────────────────────────────────────
  const setSlot    = (i, patch) => setFeeSlots((prev) => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  const addSlot    = () => setFeeSlots([...feeSlots, { inTime: form.operatingHoursStart, outTime: form.operatingHoursEnd, feeAmount: "" }]);
  const removeSlot = (i) => setFeeSlots(feeSlots.filter((_, idx) => idx !== i));

  // ── Zone coverage validation ──────────────────────────────────────────
  const coverage = useMemo(() => {
    const total = Number(form.totalSeats);
    if (!Number.isFinite(total) || total < 1) return { ok: false, msg: "Enter a valid total seats" };

    const parsed = zones.map((z) => ({
      name:  z.zoneName?.trim(),
      start: Number(z.startSeat),
      end:   Number(z.endSeat),
    }));
    if (parsed.some((p) => !p.name))
      return { ok: false, msg: "Every zone needs a name" };
    if (parsed.some((p) => !Number.isFinite(p.start) || !Number.isFinite(p.end)))
      return { ok: false, msg: "Every zone needs valid start and end seat numbers" };
    if (parsed.some((p) => p.start < 1 || p.end < 1))
      return { ok: false, msg: "Seat numbers must be 1 or greater" };
    if (parsed.some((p) => p.start > p.end))
      return { ok: false, msg: "A zone's start seat cannot be after its end seat" };
    if (parsed.some((p) => p.end > total))
      return { ok: false, msg: `A zone goes past total seats (${total})` };

    const sorted = [...parsed].sort((a, b) => a.start - b.start);
    if (sorted[0].start !== 1)
      return { ok: false, msg: `Zones must start from seat 1 (yours starts at ${sorted[0].start})` };
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].start <= sorted[i - 1].end)
        return { ok: false, msg: `Overlap at seat ${sorted[i].start}` };
      if (sorted[i].start !== sorted[i - 1].end + 1)
        return { ok: false, msg: `Gap at seat ${sorted[i - 1].end + 1} — not covered by any zone` };
    }
    if (sorted[sorted.length - 1].end !== total)
      return { ok: false, msg: `Zones cover up to seat ${sorted[sorted.length - 1].end}, but Total Seats is ${total}` };

    return { ok: true, msg: `Zones cover seats 1..${total} exactly` };
  }, [form.totalSeats, zones]);

  // ── Fee slot validation ───────────────────────────────────────────────
  const feeSlotErrors = useMemo(() => {
    const opStart = form.operatingHoursStart;
    const opEnd   = form.operatingHoursEnd;
    const errors  = [];

    feeSlots.forEach((slot, i) => {
      const label = `Slot ${i + 1}`;
      if (!slot.inTime)   { errors.push(`${label}: In Time is required`); return; }
      if (!slot.outTime)  { errors.push(`${label}: Out Time is required`); return; }
      if (!slot.feeAmount || Number(slot.feeAmount) <= 0)
        errors.push(`${label}: Fee must be greater than 0`);
      if (slot.inTime >= slot.outTime)
        errors.push(`${label}: In Time must be before Out Time`);
      if (opStart && slot.inTime < opStart)
        errors.push(`${label}: In Time ${slot.inTime} is before library opening (${opStart})`);
      if (opEnd && slot.outTime > opEnd)
        errors.push(`${label}: Out Time ${slot.outTime} is after library closing (${opEnd})`);
    });
    return errors;
  }, [feeSlots, form.operatingHoursStart, form.operatingHoursEnd]);

  const hourlyFeeValid = form.hourlyFee && Number(form.hourlyFee) > 0;

  // ── Submit ────────────────────────────────────────────────────────────
  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!coverage.ok)       { setError(coverage.msg); return; }
    if (!hourlyFeeValid)    { setError("Hourly fee is required and must be greater than 0"); return; }
    if (feeSlotErrors.length > 0) { setError(feeSlotErrors[0]); return; }

    setLoading(true);

    const hasBoysZone   = zones.some((z) => z.allowedGender === "Male");
    const hasGirlsZone  = zones.some((z) => z.allowedGender === "Female");
    const hasCommonZone = zones.some((z) => !z.allowedGender);

    const payload = {
      totalSeats:          Number(form.totalSeats),
      operatingHoursStart: form.operatingHoursStart,
      operatingHoursEnd:   form.operatingHoursEnd,
      currencySymbol:      form.currencySymbol,
      timezone:            form.timezone,
      hourlyFee:           Number(form.hourlyFee),
      hasBoysZone,
      hasGirlsZone,
      hasCommonZone,
      zones: zones.map((z, idx) => ({
        zoneName:      z.zoneName.trim(),
        allowedGender: z.allowedGender || null,
        startSeat:     Number(z.startSeat),
        endSeat:       Number(z.endSeat),
        displayOrder:  idx,
      })),
      feeSlots: feeSlots.map((s) => ({
        inTime:    s.inTime,
        outTime:   s.outTime,
        feeAmount: Number(s.feeAmount),
      })),
    };

    try {
      await API.post("/onboarding", payload);
      setOnboarded(true);
      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.message ||
        (typeof err.response?.data === "string" ? err.response.data : null) ||
        "Failed to save onboarding"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-start min-vh-100 bg-light py-4">
      <div className="card shadow-lg border-0" style={{ width: "100%", maxWidth: 760 }}>
        <div className="card-header bg-dark text-white text-center py-3">
          <h4 className="mb-0">Set up your library</h4>
          <small className="opacity-75">Configure once — you can edit later from Settings.</small>
        </div>
        <div className="card-body p-4">
          {error && <div className="alert alert-danger py-2 small">{String(error)}</div>}

          <form onSubmit={onSubmit}>

            {/* ── Basic Settings ── */}
            <h6 className="fw-bold text-muted text-uppercase mb-3" style={{ fontSize: "0.75rem", letterSpacing: "0.05em" }}>
              Library Settings
            </h6>
            <div className="row g-3 mb-4">
              <div className="col-12 col-md-4">
                <label className="form-label small fw-bold">Total Seats <span className="text-danger">*</span></label>
                <input type="number" min="1" name="totalSeats" className="form-control"
                       value={form.totalSeats} onChange={onChange} required />
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label small fw-bold">Opening Time <span className="text-danger">*</span></label>
                <input type="time" name="operatingHoursStart" className="form-control"
                       value={form.operatingHoursStart} onChange={onChange} required />
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label small fw-bold">Closing Time <span className="text-danger">*</span></label>
                <input type="time" name="operatingHoursEnd" className="form-control"
                       value={form.operatingHoursEnd} onChange={onChange} required />
              </div>
              <div className="col-6">
                <label className="form-label small fw-bold">Currency</label>
                <input name="currencySymbol" className="form-control"
                       value={form.currencySymbol} onChange={onChange} />
              </div>
              <div className="col-6">
                <label className="form-label small fw-bold">Timezone</label>
                <input name="timezone" className="form-control"
                       value={form.timezone} onChange={onChange} />
              </div>
            </div>

            <hr className="my-4" />

            {/* ── Fee Configuration ── */}
            <h6 className="fw-bold text-muted text-uppercase mb-1" style={{ fontSize: "0.75rem", letterSpacing: "0.05em" }}>
              Fee Configuration
            </h6>
            <p className="text-muted small mb-3">
              Set a fallback hourly rate (used when no exact slot matches). Then optionally add fixed slot fees.
            </p>

            {/* Hourly Fee */}
            <div className="row g-3 mb-3">
              <div className="col-12 col-md-5">
                <label className="form-label small fw-bold">
                  Hourly Fee (₹/hour) <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text">₹</span>
                  <input
                    type="number" min="1" step="0.01"
                    name="hourlyFee" className="form-control"
                    placeholder="e.g. 100"
                    value={form.hourlyFee} onChange={onChange} required
                  />
                  <span className="input-group-text">/hr</span>
                </div>
                <div className="form-text">
                  Used as fallback: if a student's slot has no fixed fee below, fee = hours × this rate.
                </div>
              </div>
            </div>

            {/* Slot-based Fees */}
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div>
                <span className="fw-semibold small">Slot-based Fee Structure</span>
                <span className="text-muted small ms-2">(optional — overrides hourly for exact slots)</span>
              </div>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={addSlot}>
                + Add Slot
              </button>
            </div>

            {feeSlots.length === 0 && (
              <div className="text-muted small mb-3 fst-italic">
                No slots added. All fees will use the hourly rate above.
              </div>
            )}

            {feeSlots.map((slot, i) => (
              <div key={i} className="row g-2 align-items-end mb-2">
                <div className="col-6 col-md-3">
                  <label className="form-label small">In Time</label>
                  <input
                    type="time" className="form-control form-control-sm"
                    value={slot.inTime}
                    min={form.operatingHoursStart}
                    max={form.operatingHoursEnd}
                    onChange={(e) => setSlot(i, { inTime: e.target.value })}
                  />
                </div>
                <div className="col-6 col-md-3">
                  <label className="form-label small">Out Time</label>
                  <input
                    type="time" className="form-control form-control-sm"
                    value={slot.outTime}
                    min={form.operatingHoursStart}
                    max={form.operatingHoursEnd}
                    onChange={(e) => setSlot(i, { outTime: e.target.value })}
                  />
                </div>
                <div className="col-6 col-md-3">
                  <label className="form-label small">Monthly Fee (₹)</label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text">₹</span>
                    <input
                      type="number" min="1" step="0.01"
                      className="form-control form-control-sm"
                      placeholder="e.g. 600"
                      value={slot.feeAmount}
                      onChange={(e) => setSlot(i, { feeAmount: e.target.value })}
                    />
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger w-100"
                    onClick={() => removeSlot(i)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            {/* Fee slot errors */}
            {feeSlotErrors.length > 0 && (
              <div className="alert alert-warning py-2 small mt-2">
                {feeSlotErrors.map((e, i) => <div key={i}>⚠️ {e}</div>)}
              </div>
            )}

            <div className="alert alert-info py-2 small mt-2 mb-0">
              💡 Slots must be within library hours ({form.operatingHoursStart} – {form.operatingHoursEnd}).
              In Time must be before Out Time.
            </div>

            <hr className="my-4" />

            {/* ── Seat Zones ── */}
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div>
                <h6 className="fw-bold text-muted text-uppercase mb-0" style={{ fontSize: "0.75rem", letterSpacing: "0.05em" }}>
                  Seat Zones
                </h6>
              </div>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={addZone}>
                + Add Zone
              </button>
            </div>
            <p className="text-muted small mb-3">
              Define non-overlapping seat ranges. Together they must cover every seat from 1 to Total Seats.
              Leave gender empty to allow any gender.
            </p>

            {zones.map((z, i) => (
              <div key={i} className="row g-2 align-items-end mb-2">
                <div className="col-12 col-md-3">
                  <label className="form-label small">Zone Name</label>
                  <input className="form-control form-control-sm" value={z.zoneName}
                         onChange={(e) => setZone(i, { zoneName: e.target.value })}
                         placeholder="e.g. BOYS_ONLY" required />
                </div>
                <div className="col-6 col-md-2">
                  <label className="form-label small">Gender</label>
                  <select className="form-select form-select-sm" value={z.allowedGender}
                          onChange={(e) => setZone(i, { allowedGender: e.target.value })}>
                    <option value="">Any</option>
                    <option value="Male">Male only</option>
                    <option value="Female">Female only</option>
                  </select>
                </div>
                <div className="col-6 col-md-2">
                  <label className="form-label small">Start Seat</label>
                  <input type="number" inputMode="numeric" min="1"
                    className="form-control form-control-sm" value={z.startSeat}
                    onChange={(e) => setZone(i, { startSeat: e.target.value })}
                    onFocus={(e) => e.target.select()} required />
                </div>
                <div className="col-6 col-md-2">
                  <label className="form-label small">End Seat</label>
                  <input type="number" inputMode="numeric" min="1"
                    className="form-control form-control-sm" value={z.endSeat}
                    onChange={(e) => setZone(i, { endSeat: e.target.value })}
                    onFocus={(e) => e.target.select()} required />
                </div>
                <div className="col-6 col-md-3">
                  <button type="button" className="btn btn-sm btn-outline-danger w-100"
                          onClick={() => removeZone(i)} disabled={zones.length === 1}>
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <div className={`alert py-2 small mt-3 mb-0 ${coverage.ok ? "alert-success" : "alert-warning"}`}>
              {coverage.ok ? "✅ " : "⚠️ "}{coverage.msg}
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 fw-bold mt-4"
              disabled={loading || !coverage.ok || !hourlyFeeValid || feeSlotErrors.length > 0}
            >
              {loading ? "Saving..." : "Finish Setup"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Onboarding;
