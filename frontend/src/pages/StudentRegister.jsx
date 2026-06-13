import { useState } from "react";
import { registerStudent, previewFee } from "../services/api";
import { toast } from "react-toastify";

function StudentRegister() {
  const emptyForm = {
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

  const [form, setForm]                     = useState(emptyForm);
  const [errors, setErrors]                 = useState({});
  const [showModal, setShowModal]           = useState(false);
  const [modalFee, setModalFee]             = useState(null);
  const [modalLoading, setModalLoading]     = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [feePreview, setFeePreview]         = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: null });
    if (["inTime","outTime","dateOfAdmission","admissionFee","discountAmount"].includes(name)) {
      setFeePreview(null);
    }
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())                                          e.name            = "Name is required";
    if (!/^\d{12}$/.test(form.aadhaarNo))                          e.aadhaarNo       = "Aadhaar must be exactly 12 digits";
    if (!/^\d{10}$/.test(form.mobile))                             e.mobile          = "Mobile must be exactly 10 digits";
    if (!form.dateOfAdmission)                                     e.dateOfAdmission = "Admission date is required";
    if (!form.inTime)                                              e.inTime          = "In Time is required";
    if (!form.outTime)                                             e.outTime         = "Out Time is required";
    if (form.inTime && form.outTime && form.inTime >= form.outTime) e.outTime         = "Out Time must be after In Time";
    if (!form.address.trim())                                      e.address         = "Address is required";
    return e;
  };

  const handlePreviewFee = async () => {
    if (!form.inTime || !form.outTime || !form.dateOfAdmission) {
      toast.warning("Please fill In Time, Out Time, and Admission Date to preview fee.");
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
        inTime:         form.inTime,
        outTime:        form.outTime,
        joiningDate:    form.dateOfAdmission,
        admissionFee:   form.admissionFee   ? Number(form.admissionFee)   : 0,
        discountAmount: form.discountAmount ? Number(form.discountAmount) : 0,
      });
      setFeePreview(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Fee preview failed");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleOpenModal = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Please fix the errors before submitting");
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await previewFee({
        inTime:         form.inTime,
        outTime:        form.outTime,
        joiningDate:    form.dateOfAdmission,
        admissionFee:   form.admissionFee   ? Number(form.admissionFee)   : 0,
        discountAmount: form.discountAmount ? Number(form.discountAmount) : 0,
      });
      setModalFee(res.data);
      setFeePreview(res.data);
      setShowModal(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load fee preview. Please try again.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmRegister = async () => {
    setModalLoading(true);
    try {
      const payload = {
        ...form,
        admissionFee:   form.admissionFee   ? Number(form.admissionFee)   : 0,
        discountAmount: form.discountAmount ? Number(form.discountAmount) : 0,
        remarks:        form.remarks || null,
      };
      const res = await registerStudent(payload);
      const regNo = res.data.regNo;

      setShowModal(false);
      setForm(emptyForm);
      setErrors({});
      setFeePreview(null);
      setModalFee(null);

      toast.success(`✅ Student Registered Successfully!\nReg No: ${regNo}`, {
        position: "top-center",
        autoClose: 5000,
        style: { textAlign: "center", whiteSpace: "pre-line" },
      });
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        err.response?.data?.error   ||
        "Registration failed"
      );
    } finally {
      setModalLoading(false);
    }
  };

  const handleReset = () => {
    setForm(emptyForm);
    setErrors({});
    setFeePreview(null);
    setModalFee(null);
    setShowModal(false);
  };

  const val = (v) => v || "—";

  // Reusable label style for modal table
  const labelStyle = {
    fontSize: "0.75rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontWeight: "600",
    color: "#6c757d",
    backgroundColor: "#f8f9fa",
    width: "25%",
    verticalAlign: "middle",
    padding: "10px 12px",
  };

  const valueStyle = {
    fontWeight: "600",
    fontSize: "0.92rem",
    padding: "10px 12px",
    verticalAlign: "middle",
  };

  return (
    <div>
      <h2 className="page-title">📝 Student Registration</h2>

      {/* ── Confirmation Modal ──────────────────────────────────────────── */}
      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">

              {/* Modal Header */}
              <div className="modal-header bg-primary text-white py-3">
                <h5 className="modal-title fw-bold">
                  🔍 Verify Student Details Before Registration
                </h5>
              </div>

              {/* Modal Body */}
              <div className="modal-body px-4 py-3">
                <p className="text-muted mb-4" style={{ fontSize: "0.88rem" }}>
                  Please verify all details carefully. Click{" "}
                  <strong>Go Back &amp; Edit</strong> to make corrections, or{" "}
                  <strong>Confirm Register</strong> to complete registration.
                </p>

                {/* ── Student Details Table ── */}
                <div className="card mb-3 border shadow-sm">
                  <div
                    className="card-header fw-bold border-bottom"
                    style={{ backgroundColor: "#e9ecef", fontSize: "0.95rem" }}
                  >
                    👤 Student Details
                  </div>
                  <div className="card-body p-0">
                    <table className="table table-bordered mb-0" style={{ fontSize: "0.9rem" }}>
                      <tbody>
                        <tr>
                          <td style={labelStyle}>Reg No</td>
                          <td style={valueStyle}>
                            <span className="badge bg-secondary" style={{ fontSize: "0.82rem" }}>
                              Auto Generated
                            </span>
                          </td>
                          <td style={labelStyle}>Name</td>
                          <td style={valueStyle}>{val(form.name)}</td>
                        </tr>
                        <tr>
                          <td style={labelStyle}>Father Name</td>
                          <td style={{ ...valueStyle, fontWeight: "400" }}>{val(form.fatherName)}</td>
                          <td style={labelStyle}>Gender</td>
                          <td style={valueStyle}>{val(form.gender)}</td>
                        </tr>
                        <tr>
                          <td style={labelStyle}>Mobile Number</td>
                          <td style={valueStyle}>{val(form.mobile)}</td>
                          <td style={labelStyle}>Aadhaar Number</td>
                          <td style={valueStyle}>{val(form.aadhaarNo)}</td>
                        </tr>
                        <tr>
                          <td style={labelStyle}>Admission Date</td>
                          <td style={valueStyle}>{val(form.dateOfAdmission)}</td>
                          <td style={labelStyle}>Slot</td>
                          <td style={valueStyle}>
                            {form.inTime && form.outTime
                              ? `${form.inTime} – ${form.outTime}`
                              : "—"}
                          </td>
                        </tr>
                        <tr>
                          <td style={labelStyle}>Address</td>
                          <td colSpan={3} style={{ ...valueStyle, fontWeight: "400" }}>
                            {val(form.address)}
                          </td>
                        </tr>
                        <tr>
                          <td style={labelStyle}>Remarks</td>
                          <td
                            colSpan={3}
                            style={{ ...valueStyle, fontWeight: "400", color: "#6c757d", fontStyle: "italic" }}
                          >
                            {val(form.remarks)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ── Fee Breakdown Table ── */}
                {modalFee && (
                  <div className="card border shadow-sm">
                    <div
                      className="card-header fw-bold border-bottom"
                      style={{ backgroundColor: "#e9ecef", fontSize: "0.95rem" }}
                    >
                      💰 Fee Breakdown
                    </div>
                    <div className="card-body p-0">
                      <table className="table table-bordered mb-0" style={{ fontSize: "0.9rem" }}>
                        <thead>
                          <tr>
                            {[
                              "Slot / Monthly Fee",
                              modalFee.isMidMonthJoining ? "Pro-rated Fee" : "Full Month Fee",
                              "Admission Fee",
                              "Discount",
                              "Total Due Now",
                            ].map((h) => (
                              <th
                                key={h}
                                className="text-center"
                                style={{
                                  fontSize: "0.72rem",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                  backgroundColor: "#f8f9fa",
                                  color: "#6c757d",
                                  fontWeight: "600",
                                  padding: "10px 8px",
                                }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="text-center">
                            <td style={valueStyle}>
                              <div>{modalFee.slotName}</div>
                              <div className="text-muted" style={{ fontSize: "0.78rem", fontWeight: "400" }}>
                                ₹{modalFee.monthlyFee}/month
                              </div>
                            </td>
                            <td style={valueStyle}>₹{modalFee.proratedFee}</td>
                            <td style={valueStyle}>₹{modalFee.admissionFee}</td>
                            <td style={{ ...valueStyle, color: "#198754" }}>
                              – ₹{modalFee.discountAmount}
                            </td>
                            <td style={{ ...valueStyle, padding: "10px 8px" }}>
                              <span
                                className="badge bg-danger"
                                style={{ fontSize: "1rem", padding: "8px 14px" }}
                              >
                                ₹{modalFee.finalFee}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      {modalFee.nextMonthMessage && (
                        <div
                          className="border-top px-3 py-2"
                          style={{
                            fontSize: "0.82rem",
                            color: "#6c757d",
                            backgroundColor: "#f8f9fa",
                          }}
                        >
                          ℹ️ {modalFee.nextMonthMessage}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={modalLoading}
                >
                  ← Go Back &amp; Edit
                </button>
                <button
                  className="btn btn-success px-4"
                  onClick={handleConfirmRegister}
                  disabled={modalLoading}
                >
                  {modalLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Registering...
                    </>
                  ) : (
                    "✅ Confirm Register"
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
      {/* ── End Modal ───────────────────────────────────────────────────── */}

      {/* ── Registration Form ───────────────────────────────────────────── */}
      <div className="form-section col-lg-8">
        <form onSubmit={handleOpenModal} noValidate>
          <div className="row g-3">

            {/* Step 1 — Time Slot & Fee */}
            <div className="col-12">
              <div className="card border-primary">
                <div className="card-header bg-primary text-white fw-bold">
                  Step 1: Time Slot &amp; Fee Calculation
                </div>
                <div className="card-body">
                  <div className="row g-3">

                    <div className="col-md-4">
                      <label className="form-label fw-bold">Date of Admission *</label>
                      <input
                        type="date"
                        className={`form-control ${errors.dateOfAdmission ? "is-invalid" : ""}`}
                        name="dateOfAdmission"
                        value={form.dateOfAdmission}
                        onChange={handleChange}
                      />
                      {errors.dateOfAdmission && (
                        <div className="invalid-feedback">{errors.dateOfAdmission}</div>
                      )}
                    </div>

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

                    <div className="col-md-4">
                      <label className="form-label fw-bold">Admission Fee (₹)</label>
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
                      <small className="text-muted">One-time charge (leave 0 if waived)</small>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-bold">Monthly Discount (₹)</label>
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

                    {feePreview && (
                      <div className="col-12">
                        <div className="alert alert-info mb-0 py-2">
                          <div className="row g-1 align-items-center text-center">
                            <div className="col-md-2">
                              <div className="small text-muted">Slot</div>
                              <strong>{feePreview.slotName}</strong>
                            </div>
                            <div className="col-md-2">
                              <div className="small text-muted">Monthly Fee</div>
                              <span>₹{feePreview.monthlyFee}</span>
                            </div>
                            <div className="col-md-2">
                              <div className="small text-muted">
                                {feePreview.isMidMonthJoining ? "Pro-rated" : "Full Month"}
                              </div>
                              <span>₹{feePreview.proratedFee}</span>
                            </div>
                            <div className="col-md-2">
                              <div className="small text-muted">Admission Fee</div>
                              <span>₹{feePreview.admissionFee}</span>
                            </div>
                            <div className="col-md-2">
                              <div className="small text-muted">Discount</div>
                              <span className="text-success">– ₹{feePreview.discountAmount}</span>
                            </div>
                            <div className="col-md-2">
                              <div className="small text-muted fw-bold">Due Now</div>
                              <span className="badge bg-danger fs-6">₹{feePreview.finalFee}</span>
                            </div>
                          </div>
                          {feePreview.nextMonthMessage && (
                            <div className="mt-1 small text-muted text-center">
                              {feePreview.nextMonthMessage}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 — Student Details */}
            <div className="col-12">
              <div className="card border-secondary">
                <div className="card-header bg-secondary text-white fw-bold">
                  Step 2: Student Details
                </div>
                <div className="card-body">
                  <div className="row g-3">

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
                        <div className="invalid-feedback">{errors.aadhaarNo}</div>
                      ) : (
                        <small className="text-muted">{form.aadhaarNo.length} / 12 digits</small>
                      )}
                    </div>

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
                        <small className="text-muted">{form.mobile.length} / 10 digits</small>
                      )}
                    </div>

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
                disabled={previewLoading}
                style={{ minWidth: 220 }}
              >
                {previewLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Loading preview...
                  </>
                ) : (
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
