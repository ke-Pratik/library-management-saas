import { useState } from "react";
import { registerStudent, previewFee } from "../services/api"; // ← ENHANCEMENT #1: import previewFee
import { toast } from "react-toastify";

function StudentRegister() {
  const [form, setForm] = useState({
    regNo: "",
    name: "",
    fatherName: "",
    aadhaarNo: "",
    gender: "Male",
    address: "",
    mobile: "",
    dateOfAdmission: "",
    inTime: "",
    outTime: "",
    // ── ENHANCEMENT #1: fee negotiation fields ──
    admissionFee: "",
    discountAmount: "",
    remarks: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [registeredStudent, setRegisteredStudent] = useState(null);

  // ── ENHANCEMENT #1: Fee preview state ────────────────────────────────
  const [feePreview, setFeePreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  // ── END ENHANCEMENT #1 ───────────────────────────────────────────────

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: null });
    // ── ENHANCEMENT #1: clear preview if time/date/fee fields change ──
    if (
      [
        "inTime",
        "outTime",
        "dateOfAdmission",
        "admissionFee",
        "discountAmount",
      ].includes(name)
    ) {
      setFeePreview(null);
    }
  };

  const validate = () => {
    const e = {};
    if (!form.regNo || Number(form.regNo) <= 0)
      e.regNo = "Enter a valid Reg No";
    if (!form.name.trim()) e.name = "Name is required";
    if (!/^\d{12}$/.test(form.aadhaarNo))
      e.aadhaarNo = "Aadhaar must be exactly 12 digits";
    if (!/^\d{10}$/.test(form.mobile))
      e.mobile = "Mobile must be exactly 10 digits";
    if (!form.dateOfAdmission) e.dateOfAdmission = "Admission date is required";
    if (!form.inTime) e.inTime = "In Time is required";
    if (!form.outTime) e.outTime = "Out Time is required";
    if (form.inTime && form.outTime && form.inTime >= form.outTime)
      e.outTime = "Out Time must be after In Time";
    if (!form.address.trim()) e.address = "Address is required";
    return e;
  };

  const emptyForm = {
    regNo: "",
    name: "",
    fatherName: "",
    aadhaarNo: "",
    gender: "Male",
    address: "",
    mobile: "",
    dateOfAdmission: "",
    inTime: "",
    outTime: "",
    admissionFee: "",
    discountAmount: "",
    remarks: "",
  };

  // ── ENHANCEMENT #1: Preview fee handler ──────────────────────────────
  // Called before registration so admin can show student the fee breakdown
  // and negotiate discount/admission fee before finalizing registration.
  const handlePreviewFee = async () => {
    if (!form.inTime || !form.outTime || !form.dateOfAdmission) {
      toast.warning(
        "Please fill In Time, Out Time, and Admission Date to preview fee.",
      );
      return;
    }
    if (form.inTime >= form.outTime) {
      toast.warning("Out Time must be after In Time.");
      return;
    }
    setPreviewLoading(true);
    setFeePreview(null);
    try {
      const res = await previewFee({
        inTime: form.inTime,
        outTime: form.outTime,
        joiningDate: form.dateOfAdmission,
        admissionFee: form.admissionFee ? Number(form.admissionFee) : 0,
        discountAmount: form.discountAmount ? Number(form.discountAmount) : 0,
      });
      setFeePreview(res.data);
      toast.success("Fee preview loaded!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Fee preview failed");
    } finally {
      setPreviewLoading(false);
    }
  };
  // ── END ENHANCEMENT #1 ───────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Please fix the errors before submitting");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        regNo: Number(form.regNo),
        // ── ENHANCEMENT #1: include negotiated fee values in payload ──
        admissionFee: form.admissionFee ? Number(form.admissionFee) : 0,
        discountAmount: form.discountAmount ? Number(form.discountAmount) : 0,
        remarks: form.remarks || null,
      };
      const res = await registerStudent(payload);
      toast.success(res.data.message || "Student registered and fee locked!");
      setRegisteredStudent(res.data);
      setFeePreview(null); // clear preview after registration
      setErrors({});
      setForm(emptyForm);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Registration failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm(emptyForm);
    setErrors({});
    setRegisteredStudent(null);
    setFeePreview(null); // ← ENHANCEMENT #1: clear preview on reset
  };

  return (
    <div>
      <h2 className="page-title">📝 Student Registration</h2>

      {/* ── ENHANCEMENT #1: Registration Confirmation Card with fee info ─── */}
      {registeredStudent && (
        <div className="alert alert-success col-lg-8 mb-4">
          <h5 className="fw-bold mb-3">✅ Student Registered & Fee Locked!</h5>
          <div className="row g-2">
            <div className="col-md-4">
              <small className="text-muted d-block">Reg No</small>
              <span className="fw-bold fs-5">{registeredStudent.regNo}</span>
            </div>
            <div className="col-md-4">
              <small className="text-muted d-block">Name</small>
              <span className="fw-bold">{registeredStudent.name}</span>
            </div>
            <div className="col-md-4">
              <small className="text-muted d-block">Gender</small>
              <span>{registeredStudent.gender}</span>
            </div>
            <div className="col-md-4">
              <small className="text-muted d-block">Time Slot</small>
              <span className="badge bg-success fs-6">
                {registeredStudent.inTime} - {registeredStudent.outTime}
              </span>
            </div>
            <div className="col-md-4">
              <small className="text-muted d-block">Admission Date</small>
              <span>{registeredStudent.dateOfAdmission}</span>
            </div>
            <div className="col-md-4">
              <small className="text-muted d-block">Fee Record ID</small>
              <span className="text-secondary">#{registeredStudent.feeId}</span>
            </div>

            {/* ── ENHANCEMENT #1: Fee summary in confirmation card ── */}
            <div className="col-12 mt-2">
              <hr className="my-2" />
              <strong>
                💰 Fee Breakdown ({registeredStudent.feeMonth}/
                {registeredStudent.feeYear})
              </strong>
            </div>
            <div className="col-md-3">
              <small className="text-muted d-block">Monthly Fee</small>
              <span>₹{registeredStudent.monthlyFee}</span>
            </div>
            <div className="col-md-3">
              <small className="text-muted d-block">Pro-rated Fee</small>
              <span>₹{registeredStudent.proratedFee}</span>
            </div>
            <div className="col-md-3">
              <small className="text-muted d-block">Admission Fee</small>
              <span>₹{registeredStudent.admissionFee}</span>
            </div>
            <div className="col-md-3">
              <small className="text-muted d-block">Discount</small>
              <span className="text-success">
                - ₹{registeredStudent.discountAmount}
              </span>
            </div>
            <div className="col-12">
              <div className="d-flex align-items-center gap-3 mt-1">
                <span className="fw-bold">Total Due This Month:</span>
                <span className="badge bg-danger fs-6">
                  ₹{registeredStudent.finalFee}
                </span>
                <span className="text-muted small">
                  {registeredStudent.nextMonthMessage}
                </span>
              </div>
            </div>
            {/* ── END ENHANCEMENT #1 fee summary ── */}
          </div>
          <button
            className="btn btn-sm btn-success mt-3"
            onClick={() => setRegisteredStudent(null)}
          >
            + Register Another Student
          </button>
        </div>
      )}

      {/* ── Registration Form ─────────────────────────────── */}
      <div className="form-section col-lg-8">
        <form onSubmit={handleSubmit} noValidate>
          <div className="row g-3">
            {/* ── ENHANCEMENT #1: SECTION 1 — Time Slot & Fee Preview ─────────
                Admin fills in time/date/fee fields first, previews the fee,
                shows student the breakdown, negotiates discount, then fills
                student details and registers. Preview does NOT save anything. */}
            <div className="col-12">
              <div className="card border-primary">
                <div className="card-header bg-primary text-white fw-bold">
                  Step 1: Time Slot & Fee Calculation
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    {/* Admission Date */}
                    <div className="col-md-4">
                      <label className="form-label fw-bold">
                        Date of Admission *
                      </label>
                      <input
                        type="date"
                        className={`form-control ${errors.dateOfAdmission ? "is-invalid" : ""}`}
                        name="dateOfAdmission"
                        value={form.dateOfAdmission}
                        onChange={handleChange}
                      />
                      {errors.dateOfAdmission && (
                        <div className="invalid-feedback">
                          {errors.dateOfAdmission}
                        </div>
                      )}
                    </div>

                    {/* In Time */}
                    <div className="col-md-4">
                      <label className="form-label fw-bold">In Time *</label>
                      <input
                        type="time"
                        className={`form-control ${errors.inTime ? "is-invalid" : ""}`}
                        name="inTime"
                        value={form.inTime}
                        onChange={handleChange}
                      />
                      {errors.inTime && (
                        <div className="invalid-feedback">{errors.inTime}</div>
                      )}
                    </div>

                    {/* Out Time */}
                    <div className="col-md-4">
                      <label className="form-label fw-bold">Out Time *</label>
                      <input
                        type="time"
                        className={`form-control ${errors.outTime ? "is-invalid" : ""}`}
                        name="outTime"
                        value={form.outTime}
                        onChange={handleChange}
                      />
                      {errors.outTime && (
                        <div className="invalid-feedback">{errors.outTime}</div>
                      )}
                    </div>

                    {/* Admission Fee */}
                    <div className="col-md-4">
                      <label className="form-label fw-bold">
                        Admission Fee (₹)
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        name="admissionFee"
                        value={form.admissionFee}
                        onChange={handleChange}
                        placeholder="0"
                        min="0"
                        step="0.01"
                      />
                      <small className="text-muted">
                        One-time charge (leave 0 if waived)
                      </small>
                    </div>

                    {/* Discount */}
                    <div className="col-md-4">
                      <label className="form-label fw-bold">
                        Monthly Discount (₹)
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        name="discountAmount"
                        value={form.discountAmount}
                        onChange={handleChange}
                        placeholder="0"
                        min="0"
                        step="0.01"
                      />
                      <small className="text-muted">Applied every month</small>
                    </div>

                    {/* Preview Button */}
                    <div className="col-md-4 d-flex align-items-end">
                      <button
                        type="button"
                        className="btn btn-outline-primary w-100"
                        onClick={handlePreviewFee}
                        disabled={previewLoading}
                      >
                        {previewLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" />
                            Calculating...
                          </>
                        ) : (
                          "🔍 Preview Fee"
                        )}
                      </button>
                    </div>

                    {/* ── ENHANCEMENT #1: Fee Preview Result ───────────────────
                        Shown inline after Preview Fee button is clicked.
                        Admin reads this, discusses with student, adjusts
                        discount/admissionFee and clicks Preview again. */}
                    {feePreview && (
                      <div className="col-12">
                        <div className="alert alert-info mb-0 py-2">
                          <div className="row g-1 align-items-center">
                            <div className="col-md-2 text-center">
                              <div className="small text-muted">Slot</div>
                              <strong>{feePreview.slotName}</strong>
                            </div>
                            <div className="col-md-2 text-center">
                              <div className="small text-muted">
                                Monthly Fee
                              </div>
                              <span>₹{feePreview.monthlyFee}</span>
                            </div>
                            <div className="col-md-2 text-center">
                              <div className="small text-muted">
                                {feePreview.isMidMonthJoining
                                  ? "Pro-rated"
                                  : "Full Month"}
                              </div>
                              <span>₹{feePreview.proratedFee}</span>
                            </div>
                            <div className="col-md-2 text-center">
                              <div className="small text-muted">
                                Admission Fee
                              </div>
                              <span>₹{feePreview.admissionFee}</span>
                            </div>
                            <div className="col-md-2 text-center">
                              <div className="small text-muted">Discount</div>
                              <span className="text-success">
                                - ₹{feePreview.discountAmount}
                              </span>
                            </div>
                            <div className="col-md-2 text-center">
                              <div className="small text-muted fw-bold">
                                Due Now
                              </div>
                              <span className="badge bg-danger fs-6">
                                ₹{feePreview.finalFee}
                              </span>
                            </div>
                          </div>
                          <div className="mt-1 small text-muted text-center">
                            {feePreview.nextMonthMessage}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* ── END fee preview result ── */}
                  </div>
                </div>
              </div>
            </div>
            {/* ── END ENHANCEMENT #1 SECTION 1 ───────────────────────────────── */}

            {/* ── SECTION 2 — Student Details ─────────────────────────────── */}
            <div className="col-12">
              <div className="card border-secondary">
                <div className="card-header bg-secondary text-white fw-bold">
                  Step 2: Student Details
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    {/* Reg No */}
                    <div className="col-md-6">
                      <label className="form-label fw-bold">Reg No *</label>
                      <input
                        type="number"
                        className={`form-control ${errors.regNo ? "is-invalid" : ""}`}
                        name="regNo"
                        value={form.regNo}
                        onChange={handleChange}
                      />
                      {errors.regNo && (
                        <div className="invalid-feedback">{errors.regNo}</div>
                      )}
                    </div>

                    {/* Name */}
                    <div className="col-md-6">
                      <label className="form-label fw-bold">Name *</label>
                      <input
                        type="text"
                        className={`form-control ${errors.name ? "is-invalid" : ""}`}
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                      />
                      {errors.name && (
                        <div className="invalid-feedback">{errors.name}</div>
                      )}
                    </div>

                    {/* Father Name */}
                    <div className="col-md-6">
                      <label className="form-label fw-bold">Father Name</label>
                      <input
                        type="text"
                        className="form-control"
                        name="fatherName"
                        value={form.fatherName}
                        onChange={handleChange}
                      />
                    </div>

                    {/* Aadhaar */}
                    <div className="col-md-6">
                      <label className="form-label fw-bold">Aadhaar No *</label>
                      <input
                        type="text"
                        className={`form-control ${
                          errors.aadhaarNo
                            ? "is-invalid"
                            : form.aadhaarNo && /^\d{12}$/.test(form.aadhaarNo)
                              ? "is-valid"
                              : ""
                        }`}
                        name="aadhaarNo"
                        value={form.aadhaarNo}
                        onChange={handleChange}
                        maxLength="12"
                        placeholder="12-digit Aadhaar number"
                      />
                      {errors.aadhaarNo ? (
                        <div className="invalid-feedback">
                          {errors.aadhaarNo}
                        </div>
                      ) : (
                        <small className="text-muted">
                          {form.aadhaarNo.length} / 12 digits
                        </small>
                      )}
                    </div>

                    {/* Gender */}
                    <div className="col-md-6">
                      <label className="form-label fw-bold">Gender *</label>
                      <select
                        className="form-select"
                        name="gender"
                        value={form.gender}
                        onChange={handleChange}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>

                    {/* Mobile */}
                    <div className="col-md-6">
                      <label className="form-label fw-bold">Mobile *</label>
                      <input
                        type="text"
                        className={`form-control ${
                          errors.mobile
                            ? "is-invalid"
                            : form.mobile && /^\d{10}$/.test(form.mobile)
                              ? "is-valid"
                              : ""
                        }`}
                        name="mobile"
                        value={form.mobile}
                        onChange={handleChange}
                        maxLength="10"
                        placeholder="10-digit mobile number"
                      />
                      {errors.mobile ? (
                        <div className="invalid-feedback">{errors.mobile}</div>
                      ) : (
                        <small className="text-muted">
                          {form.mobile.length} / 10 digits
                        </small>
                      )}
                    </div>

                    {/* Address */}
                    <div className="col-12">
                      <label className="form-label fw-bold">Address *</label>
                      <textarea
                        className={`form-control ${errors.address ? "is-invalid" : ""}`}
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        rows="2"
                      />
                      {errors.address && (
                        <div className="invalid-feedback">{errors.address}</div>
                      )}
                    </div>

                    {/* Remarks — ENHANCEMENT #1: stored on first FeeRecord */}
                    <div className="col-12">
                      <label className="form-label fw-bold">Remarks</label>
                      <input
                        type="text"
                        className="form-control"
                        name="remarks"
                        value={form.remarks}
                        onChange={handleChange}
                        placeholder="Optional — e.g. fee waiver reason, special case"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="col-12 d-flex gap-3 mt-2">
              <button
                type="submit"
                className="btn btn-primary px-4"
                disabled={loading}
                style={{ minWidth: 200 }}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Registering...
                  </>
                ) : (
                  // ← ENHANCEMENT #1: button label updated
                  "✅ Register & Lock Fee"
                )}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary px-4"
                onClick={handleReset}
              >
                🔄 Reset
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StudentRegister;
