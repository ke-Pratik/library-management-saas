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
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        regNo: Number(form.regNo),
        inTime: form.inTime,
        outTime: form.outTime,
      };
      const res = await registerStudent(payload);
      toast.success(res.data.message || "Student registered!");
      setForm({
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
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Registration failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({
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
  };

  return (
    <div>
      <h2 className="page-title">📝 Student Registration</h2>
      <div className="form-section col-lg-8">
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label fw-bold">Reg No *</label>
              <input
                type="number"
                className="form-control"
                name="regNo"
                value={form.regNo}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-bold">Name *</label>
              <input
                type="text"
                className="form-control"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
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
                className="form-control"
                name="aadhaarNo"
                value={form.aadhaarNo}
                onChange={handleChange}
                maxLength="12"
                required
              />
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
                className="form-control"
                name="mobile"
                value={form.mobile}
                onChange={handleChange}
                maxLength="15"
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-bold">Date of Admission *</label>
              <input
                type="date"
                className="form-control"
                name="dateOfAdmission"
                value={form.dateOfAdmission}
                onChange={handleChange}
                required
              />
            </div>
             <div className="col-md-4">
              <label className="form-label fw-bold">In Time *</label>
              <input
                type="time"
                className="form-control"
                name="inTime"
                value={form.inTime}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-bold">Out Time *</label>
              <input
                type="time"
                className="form-control"
                name="outTime"
                value={form.outTime}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-12">
              <label className="form-label fw-bold">Address *</label>
              <textarea
                className="form-control"
                name="address"
                value={form.address}
                onChange={handleChange}
                rows="2"
                required
              />
            </div>
            <div className="col-12 d-flex gap-3 mt-4">
              <button
                type="submit"
                className="btn btn-primary px-4"
                disabled={loading}
              >
                {loading ? "Registering..." : "✅ Register Student"}
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
