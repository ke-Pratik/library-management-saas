import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";

function Onboarding() {
  const navigate = useNavigate();
  const { setOnboarded } = useAuth();

  const [form, setForm] = useState({
    totalSeats: "65",
    operatingHoursStart: "08:00",
    operatingHoursEnd: "22:00",
    currencySymbol: "INR",
    timezone: "Asia/Kolkata",
  });

  const [zones, setZones] = useState([
    { zoneName: "BOYS_ONLY",  allowedGender: "Male",   startSeat: "1",  endSeat: "17" },
    { zoneName: "GIRLS_ONLY", allowedGender: "Female", startSeat: "18", endSeat: "30" },
    { zoneName: "COMMON",     allowedGender: "",       startSeat: "31", endSeat: "65" },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const setZone = (i, patch) =>
    setZones((prev) => prev.map((z, idx) => (idx === i ? { ...z, ...patch } : z)));

  const addZone = () =>
    setZones([...zones, { zoneName: "", allowedGender: "", startSeat: "", endSeat: "" }]);

  const removeZone = (i) => setZones(zones.filter((_, idx) => idx !== i));

  const coverage = useMemo(() => {
    const total = Number(form.totalSeats);
    if (!Number.isFinite(total) || total < 1) return { ok: false, msg: "Enter a valid total seats" };

    const parsed = zones.map((z, i) => ({
      i,
      name: z.zoneName?.trim(),
      start: Number(z.startSeat),
      end: Number(z.endSeat),
    }));
    if (parsed.some((p) => !p.name)) return { ok: false, msg: "Every zone needs a name" };
    if (parsed.some((p) => !Number.isFinite(p.start) || !Number.isFinite(p.end))) {
      return { ok: false, msg: "Every zone needs valid start and end seat numbers" };
    }
    if (parsed.some((p) => p.start < 1 || p.end < 1)) {
      return { ok: false, msg: "Seat numbers must be 1 or greater" };
    }
    if (parsed.some((p) => p.start > p.end)) {
      return { ok: false, msg: "A zone's start seat cannot be after its end seat" };
    }
    if (parsed.some((p) => p.end > total)) {
      return { ok: false, msg: `A zone goes past total seats (${total}). Either raise total seats or shrink the zone.` };
    }

    const sorted = [...parsed].sort((a, b) => a.start - b.start);
    if (sorted[0].start !== 1) {
      return { ok: false, msg: `Zones must start from seat 1 (yours starts at ${sorted[0].start})` };
    }
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].start <= sorted[i - 1].end) {
        return { ok: false, msg: `Overlap at seat ${sorted[i].start} (in two zones)` };
      }
      if (sorted[i].start !== sorted[i - 1].end + 1) {
        return { ok: false, msg: `Gap at seat ${sorted[i - 1].end + 1} — not covered by any zone` };
      }
    }
    if (sorted[sorted.length - 1].end !== total) {
      return {
        ok: false,
        msg: `Zones cover up to seat ${sorted[sorted.length - 1].end}, but Total Seats is ${total}. They must match exactly.`,
      };
    }
    return { ok: true, msg: `Zones cover seats 1..${total} exactly ✓` };
  }, [form.totalSeats, zones]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!coverage.ok) {
      setError(coverage.msg);
      return;
    }
    setLoading(true);

    const hasBoysZone   = zones.some((z) => z.allowedGender === "Male");
    const hasGirlsZone  = zones.some((z) => z.allowedGender === "Female");
    const hasCommonZone = zones.some((z) => !z.allowedGender);

    const payload = {
      totalSeats: Number(form.totalSeats),
      operatingHoursStart: form.operatingHoursStart,
      operatingHoursEnd: form.operatingHoursEnd,
      currencySymbol: form.currencySymbol,
      timezone: form.timezone,
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
      <div className="card shadow-lg border-0" style={{ width: "100%", maxWidth: 720 }}>
        <div className="card-header bg-dark text-white text-center py-3">
          <h4 className="mb-0">Set up your library</h4>
          <small className="opacity-75">Configure once — you can edit later from Settings.</small>
        </div>
        <div className="card-body p-4">
          {error && <div className="alert alert-danger py-2 small">{String(error)}</div>}

          <form onSubmit={onSubmit}>
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

            <hr className="my-4" />
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">Seat zones</h6>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={addZone}>
                + Add zone
              </button>
            </div>
            <p className="text-muted small mb-3">
              Define non-overlapping seat ranges. Together they must cover every seat from 1 to Total Seats.
              Leave gender empty to allow any gender on those seats.
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
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    className="form-control form-control-sm"
                    value={z.startSeat}
                    onChange={(e) => setZone(i, { startSeat: e.target.value })}
                    onFocus={(e) => e.target.select()}
                    required
                  />
                </div>
                <div className="col-6 col-md-2">
                  <label className="form-label small">End seat</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    className="form-control form-control-sm"
                    value={z.endSeat}
                    onChange={(e) => setZone(i, { endSeat: e.target.value })}
                    onFocus={(e) => e.target.select()}
                    required
                  />
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
              disabled={loading || !coverage.ok}
            >
              {loading ? "Saving..." : "Finish setup"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Onboarding;
