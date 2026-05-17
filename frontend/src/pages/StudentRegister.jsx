import { useState } from "react";
import { registerStudent } from "../services/api";
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
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [registeredStudent, setRegisteredStudent] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: null });
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
  };

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
      const res = await registerStudent({ ...form, regNo: Number(form.regNo) });
      toast.success(res.data.message || "Student registered!");
      setRegisteredStudent(res.data);
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
  };

  return (
    <div>
      <h2 className="page-title">📝 Student Registration</h2>

      {/* ── Confirmation Card ─────────────────────────────── */}
      {registeredStudent && (
        <div className="alert alert-success col-lg-8 mb-4">
          <h5 className="fw-bold mb-3">✅ Student Registered Successfully!</h5>
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
              <span className="badge bg-success">
                {registeredStudent.inTime} - {registeredStudent.outTime}
              </span>
            </div>
            <div className="col-md-4">
              <small className="text-muted d-block">Admission Date</small>
              <span>{registeredStudent.dateOfAdmission}</span>
            </div>
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
                <div className="invalid-feedback">{errors.aadhaarNo}</div>
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

            {/* Admission Date */}
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

            {/* Buttons */}
            <div className="col-12 d-flex gap-3 mt-2">
              <button
                type="submit"
                className="btn btn-primary px-4"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Registering...
                  </>
                ) : (
                  "✅ Register Student"
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
