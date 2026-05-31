import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";

/**
 * Library owner onboarding form. Collects basic settings + explicit seat
 * zone layout. Each zone is a contiguous seat range with an optional gender
 * restriction. The backend validates ranges (in-bounds, non-overlapping).
 */
function Onboarding() {
  const navigate = useNavigate();
  const { setOnboarded } = useAuth();

  const [form, setForm] = useState({
    totalSeats: 65,
    operatingHoursStart: "08:00",
    operatingHoursEnd: "22:00",
    currencySymbol: "INR",
    timezone: "Asia/Kolkata",
  });

  // Reasonable default zone layout for a 65-seat library.
  const [zones, setZones] = useState([
    { zoneName: "BOYS_ONLY", allowedGender: "Male", startSeat: 1, endSeat: 17 },
    { zoneName: "GIRLS_ONLY", allowedGender: "Female", startSeat: 18, endSeat: 30 },
    { zoneName: "COMMON", allowedGender: "", startSeat: 31, endSeat: 65 },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Keep the last common-zone end-seat aligned with totalSeats if the user
  // increases totalSeats and hasn't manually shifted the ranges.
  useEffect(() => {
    if (!zones.length) return;
    const last = zones[zones.length - 1];
    if (last.endSeat < form.totalSeats) {
      setZones((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { ...last, endSeat: form.totalSeats };
        return copy;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.totalSeats]);

  const onChange = (e) => {
    const { name, value, type } = e.target;
    setForm({ ...form, [name]: type === "number" ? Number(value) : value });
  };

  const setZone = (i, patch) =>
    setZones((prev) => prev.map((z, idx) => (idx === i ? { ...z, ...patch } : z)));

  const addZone = () =>
    setZones([...zones, { zoneName: "", allowedGender: "", startSeat: 1, endSeat: 1 }]);

  const removeZone = (i) => setZones(zones.filter((_, idx) => idx !== i));

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Derive boolean flags from zone definitions for backward-compatibility
    // with parts of the UI that still branch on hasBoysZone / hasGirlsZone / hasCommonZone.
    const hasBoysZone = zones.some((z) => z.allowedGender === "Male");
    const hasGirlsZone = zones.some((z) => z.allowedGender === "Female");
    const hasCommonZone = zones.some((z) => !z.allowedGender);

    const payload = {
      ...form,
      hasBoysZone,
      hasGirlsZone,
      hasCommonZone,
      zones: zones.map((z, idx) => ({
        zoneName: z.zoneName.trim(),
        allowedGender: z.allowedGender || null,
        startSeat: Number(z.startSeat),
        endSeat: Number(z.endSeat),
        displayOrder: idx,
      })),
    };

    try {
      await API.post("/onboarding", payload);
      setOnboarded(true);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data || "Failed to save onboarding");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-start min-vh-100 bg-light py-4">
      <div className="card shadow-lg border-0" style={{ width: "100%", maxWidth: 720 }}>
        <div className="card-header bg-dark text-white text-center py-3">
          <h4 className="mb-0">Set up your library</h4>
          <small className="opacity-75">Configure once — you can edit later from Settings.</small>
        </div>
        <div className="card-body p-4">
          {error && <div className="alert alert-danger py-2 small">{String(error)}</div>}

          <form onSubmit={onSubmit}>
            {/* --- basic settings --- */}
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <label className="form-label small fw-bold">Total seats</label>
                <input type="number" min="1" name="totalSeats" className="form-control"
                       value={form.totalSeats} onChange={onChange} required />
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label small fw-bold">Opening time</label>
                <input type="time" name="operatingHoursStart" className="form-control"
                       value={form.operatingHoursStart} onChange={onChange} required />
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label small fw-bold">Closing time</label>
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

            {/* --- zones --- */}
            <hr className="my-4" />
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">Seat zones</h6>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={addZone}>
                + Add zone
              </button>
            </div>
            <p className="text-muted small mb-3">
              Define non-overlapping seat ranges. Leave gender empty to allow any gender on those seats.
            </p>

            {zones.map((z, i) => (
              <div key={i} className="row g-2 align-items-end mb-2">
                <div className="col-12 col-md-3">
                  <label className="form-label small">Zone name</label>
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
                  <label className="form-label small">Start seat</label>
                  <input type="number" min="1" className="form-control form-control-sm"
                         value={z.startSeat}
                         onChange={(e) => setZone(i, { startSeat: Number(e.target.value) })} required />
                </div>
                <div className="col-6 col-md-2">
                  <label className="form-label small">End seat</label>
                  <input type="number" min="1" className="form-control form-control-sm"
                         value={z.endSeat}
                         onChange={(e) => setZone(i, { endSeat: Number(e.target.value) })} required />
                </div>
                <div className="col-6 col-md-3">
                  <button type="button" className="btn btn-sm btn-outline-danger w-100"
                          onClick={() => removeZone(i)} disabled={zones.length === 1}>
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <button type="submit" className="btn btn-primary w-100 fw-bold mt-4" disabled={loading}>
              {loading ? "Saving..." : "Finish setup"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Onboarding;
