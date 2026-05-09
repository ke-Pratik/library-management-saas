import { useState } from "react";
import { previewFee, lockFee, searchStudents } from "../services/api";
import { toast } from "react-toastify";

function FeeCalculate() {
  const [activeTab, setActiveTab] = useState("enquiry");

  // ═══════════════════════════════════════
  // ENQUIRY MODE
  // ═══════════════════════════════════════
  const [enquiryForm, setEnquiryForm] = useState({
    inTime: "07:00",
    outTime: "12:00",
    joiningDate: "",
    discountAmount: "",
    admissionFee: "",
  });
  const [enquiryPreview, setEnquiryPreview]   = useState(null);
  const [enquiryLoading, setEnquiryLoading]   = useState(false);
  const [enquiryRegNo, setEnquiryRegNo]       = useState("");
  const [enquiryRemarks, setEnquiryRemarks]   = useState("");
  const [enquiryLocking, setEnquiryLocking]   = useState(false);

  // ═══════════════════════════════════════
  // EXISTING STUDENT
  // ═══════════════════════════════════════
  const [studentSearchType, setStudentSearchType]   = useState("name");
  const [studentSearchValue, setStudentSearchValue] = useState("");
  const [searchResults, setSearchResults]           = useState([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [studentInfo, setStudentInfo]               = useState(null);
  const [studentForm, setStudentForm]               = useState({
    inTime: "", outTime: "", joiningDate: "", discountAmount: "", admissionFee: "",
  });
  const [studentPreview, setStudentPreview] = useState(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentRemarks, setStudentRemarks] = useState("");
  const [studentLocking, setStudentLocking] = useState(false);

  // ═══════════════════════════════════════
  // ENQUIRY: Calculate
  // ═══════════════════════════════════════
  const handleEnquiryPreview = async (e) => {
    e.preventDefault();
    setEnquiryLoading(true);
    setEnquiryPreview(null);
    try {
      const res = await previewFee({
        inTime:         enquiryForm.inTime,
        outTime:        enquiryForm.outTime,
        joiningDate:    enquiryForm.joiningDate,
        discountAmount: enquiryForm.discountAmount ? Number(enquiryForm.discountAmount) : null,
        admissionFee:   enquiryForm.admissionFee   ? Number(enquiryForm.admissionFee)   : null,
      });
      setEnquiryPreview(res.data);
      toast.success("Fee calculated successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Calculation failed");
    } finally {
      setEnquiryLoading(false);
    }
  };

  // ═══════════════════════════════════════
  // ENQUIRY: Lock
  // ═══════════════════════════════════════
  const handleEnquiryLock = async () => {
    if (!enquiryRegNo) { toast.error("Enter Reg No"); return; }
    setEnquiryLocking(true);
    try {
      await lockFee({
        regNo:          Number(enquiryRegNo),
        inTime:         enquiryForm.inTime,
        outTime:        enquiryForm.outTime,
        joiningDate:    enquiryForm.joiningDate,
        discountAmount: enquiryForm.discountAmount ? Number(enquiryForm.discountAmount) : null,
        admissionFee:   enquiryForm.admissionFee   ? Number(enquiryForm.admissionFee)   : null,
        remarks:        enquiryRemarks || null,
      });
      toast.success("Fee locked successfully");
      setEnquiryPreview(null);
      setEnquiryRegNo("");
      setEnquiryRemarks("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Lock failed");
    } finally {
      setEnquiryLocking(false);
    }
  };

  // ═══════════════════════════════════════
  // STUDENT: Search
  // ═══════════════════════════════════════
  const handleStudentSearch = async (e) => {
    e.preventDefault();
    if (!studentSearchValue.trim()) { toast.error("Enter search value"); return; }
    setStudentSearchLoading(true);
    setSearchResults([]);
    try {
      const res = await searchStudents(studentSearchType, studentSearchValue.trim());
      setSearchResults(res.data);
      if (res.data.length === 0) toast.info("No students found");
    } catch (err) {
      toast.error(err.response?.data?.message || "Search failed");
    } finally {
      setStudentSearchLoading(false);
    }
  };

  // ═══════════════════════════════════════
  // STUDENT: Select
  // ═══════════════════════════════════════
  const handleSelectStudent = (student) => {
    setStudentInfo(student);
    setStudentForm({
      inTime:         student.inTime         || "",
      outTime:        student.outTime        || "",
      joiningDate:    student.dateOfAdmission || "",
      discountAmount: "",
      admissionFee:   "",
    });
    setStudentPreview(null);
    setSearchResults([]);
    setStudentSearchValue("");
    toast.success(`Selected: ${student.name}`);
  };

  // ═══════════════════════════════════════
  // STUDENT: Calculate
  // ═══════════════════════════════════════
  const handleStudentPreview = async (e) => {
    e.preventDefault();
    if (!studentInfo) { toast.error("Select a student first"); return; }
    setStudentLoading(true);
    setStudentPreview(null);
    try {
      const res = await previewFee({
        inTime:         studentForm.inTime,
        outTime:        studentForm.outTime,
        joiningDate:    studentForm.joiningDate,
        discountAmount: studentForm.discountAmount ? Number(studentForm.discountAmount) : null,
        admissionFee:   studentForm.admissionFee   ? Number(studentForm.admissionFee)   : null,
      });
      setStudentPreview(res.data);
      toast.success("Fee calculated successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Calculation failed");
    } finally {
      setStudentLoading(false);
    }
  };

  // ═══════════════════════════════════════
  // STUDENT: Lock
  // ═══════════════════════════════════════
  const handleStudentLock = async () => {
    if (!studentInfo) { toast.error("Select a student first"); return; }
    setStudentLocking(true);
    try {
      await lockFee({
        regNo:          Number(studentInfo.regNo),
        inTime:         studentForm.inTime,
        outTime:        studentForm.outTime,
        joiningDate:    studentForm.joiningDate,
        discountAmount: studentForm.discountAmount ? Number(studentForm.discountAmount) : null,
        admissionFee:   studentForm.admissionFee   ? Number(studentForm.admissionFee)   : null,
        remarks:        studentRemarks || null,
      });
      toast.success("Fee locked successfully");
      setStudentPreview(null);
      setStudentRemarks("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Lock failed");
    } finally {
      setStudentLocking(false);
    }
  };

  // ═══════════════════════════════════════
  // SHARED: Fee breakdown table
  // ═══════════════════════════════════════
  const renderFeeTable = (data) => (
    <table className="table table-bordered mt-4">
      <tbody>
        <tr>
          <th>Slot</th>
          <td>{data.slotName} ({data.timeSlot})</td>
        </tr>
        <tr>
          <th>Joining Date</th>
          <td>{data.joiningDate} {data.isMidMonthJoining ? "⚠️ Mid-month" : "✅ Full month"}</td>
        </tr>
        <tr>
          <th>Applicable Days</th>
          <td>{data.applicableDays} / {data.totalDaysInMonth} days</td>
        </tr>
        <tr>
          <th>Monthly Fee</th>
          <td>₹ {data.monthlyFee}</td>
        </tr>
        <tr>
          <th>Pro-rated Fee</th>
          <td>₹ {data.proratedFee}</td>
        </tr>
        {data.admissionFee > 0 && (
          <tr className="table-warning">
            <th>Admission Fee (one-time)</th>
            <td>₹ {data.admissionFee}</td>
          </tr>
        )}
        <tr>
          <th>Discount</th>
          <td>- ₹ {data.discountAmount}</td>
        </tr>
        <tr className="table-success">
          <th className="fs-5">This Month Total</th>
          <td className="fw-bold text-success fs-4">₹ {data.finalFee}</td>
        </tr>
        <tr>
          <th>Calculation Method</th>
          <td><small>{data.calculationMethod}</small></td>
        </tr>
        <tr>
          <th>From Next Month</th>
          <td className="text-primary fw-bold">₹ {data.nextMonthFinalFee} / month</td>
        </tr>
      </tbody>
    </table>
  );

  // ═══════════════════════════════════════
  // SHARED: Form fields (reused in both tabs)
  // ═══════════════════════════════════════
  const renderFeeForm = (form, setForm, onSubmit, loading, isEnquiry = false) => (
    <form onSubmit={onSubmit}>
      <div className="row g-3">
        <div className="col-md-3">
          <label className="form-label fw-bold">In Time *</label>
          <input type="time" className="form-control"
            value={form.inTime}
            onChange={(e) => setForm({ ...form, inTime: e.target.value })}
            required />
        </div>
        <div className="col-md-3">
          <label className="form-label fw-bold">Out Time *</label>
          <input type="time" className="form-control"
            value={form.outTime}
            onChange={(e) => setForm({ ...form, outTime: e.target.value })}
            required />
        </div>
        <div className="col-md-3">
          <label className="form-label fw-bold">
            {isEnquiry ? "Expected Joining Date *" : "Admission Date *"}
          </label>
          <input type="date" className="form-control"
            value={form.joiningDate}
            onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
            required />
        </div>
        <div className="col-md-3">
          <label className="form-label fw-bold">Admission Fee ₹</label>
          <input type="number" className="form-control" placeholder="0"
            value={form.admissionFee}
            onChange={(e) => setForm({ ...form, admissionFee: e.target.value })} />
          <small className="text-muted">One-time, first month only</small>
        </div>
        <div className="col-md-3">
          <label className="form-label fw-bold">Monthly Discount ₹</label>
          <input type="number" className="form-control" placeholder="0"
            value={form.discountAmount}
            onChange={(e) => setForm({ ...form, discountAmount: e.target.value })} />
          <small className="text-muted">Auto pro-rated if mid-month</small>
        </div>
      </div>
      <button type="submit" className="btn btn-primary mt-4" disabled={loading}>
        {loading ? "Calculating..." : "🧮 Calculate Fee"}
      </button>
    </form>
  );

  return (
    <div className="container py-4">
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <h3 className="fw-bold mb-4">💰 Fee Calculation</h3>

          {/* TABS */}
          <div className="d-flex gap-2 mb-4">
            <button
              className={`btn ${activeTab === "enquiry" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setActiveTab("enquiry")}
            >
              🆕 New Enquiry
            </button>
            <button
              className={`btn ${activeTab === "student" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setActiveTab("student")}
            >
              👤 Existing Student
            </button>
          </div>

          {/* ═══════════════════════ ENQUIRY TAB ═══════════════════════ */}
          {activeTab === "enquiry" && (
            <>
              <div className="alert alert-light border mb-4">
                <strong>📋 When to use:</strong> Walk-in enquiry. Calculate fee before student registers.
              </div>

              {renderFeeForm(enquiryForm, setEnquiryForm, handleEnquiryPreview, enquiryLoading, true)}

              {enquiryPreview && (
                <>
                  {renderFeeTable(enquiryPreview)}

                  <div className="border rounded p-3 mt-4 bg-light">
                    <h5 className="fw-bold mb-1">🔒 Student Agreed? Lock Fee</h5>
                    <p className="text-muted small mb-3">
                      Register the student first on the <strong>📝 Register</strong> page, then enter their Reg No below.
                    </p>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="form-label fw-bold">Reg No *</label>
                        <input type="number" className="form-control"
                          placeholder="Enter after registration"
                          value={enquiryRegNo}
                          onChange={(e) => setEnquiryRegNo(e.target.value)} />
                      </div>
                      <div className="col-md-8">
                        <label className="form-label fw-bold">Remarks</label>
                        <input type="text" className="form-control" placeholder="Optional"
                          value={enquiryRemarks}
                          onChange={(e) => setEnquiryRemarks(e.target.value)} />
                      </div>
                    </div>
                    <button type="button" className="btn btn-success mt-3"
                      onClick={handleEnquiryLock} disabled={enquiryLocking}>
                      {enquiryLocking ? "Locking..." : "🔒 Lock Fee & Save"}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* ═══════════════════════ STUDENT TAB ═══════════════════════ */}
          {activeTab === "student" && (
            <>
              <div className="alert alert-light border mb-4">
                <strong>📋 When to use:</strong> Student already registered. Search → auto-fills time → calculate → lock.
              </div>

              {/* Search */}
              <div className="border rounded p-3 bg-light mb-4">
                <h5 className="fw-bold mb-3">🔍 Find Student</h5>
                <form onSubmit={handleStudentSearch}>
                  <div className="row g-3 align-items-end">
                    <div className="col-md-3">
                      <label className="form-label">Search By</label>
                      <select className="form-select" value={studentSearchType}
                        onChange={(e) => {
                          setStudentSearchType(e.target.value);
                          setStudentSearchValue("");
                          setSearchResults([]);
                        }}>
                        <option value="name">Name</option>
                        <option value="regNo">Reg No</option>
                        <option value="mobile">Mobile</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Value</label>
                      <input
                        type={studentSearchType === "regNo" ? "number" : "text"}
                        className="form-control"
                        value={studentSearchValue}
                        onChange={(e) => setStudentSearchValue(e.target.value)}
                        placeholder="Enter value..." />
                    </div>
                    <div className="col-md-3">
                      <button type="submit" className="btn btn-primary w-100"
                        disabled={studentSearchLoading}>
                        {studentSearchLoading ? "Searching..." : "🔍 Search"}
                      </button>
                    </div>
                  </div>
                </form>

                {searchResults.length > 0 && (
                  <div className="table-responsive mt-3">
                    <table className="table table-hover table-bordered table-sm">
                      <thead className="table-dark">
                        <tr>
                          <th>Reg No</th><th>Name</th><th>Mobile</th>
                          <th>Admission</th><th>Time</th><th>Select</th>
                        </tr>
                      </thead>
                      <tbody>
                        {searchResults.map((s) => (
                          <tr key={s.regNo}>
                            <td>{s.regNo}</td>
                            <td>{s.name}</td>
                            <td>{s.mobile}</td>
                            <td>{s.dateOfAdmission}</td>
                            <td>{s.inTime && s.outTime ? `${s.inTime} - ${s.outTime}` : "-"}</td>
                            <td>
                              <button className="btn btn-sm btn-success"
                                onClick={() => handleSelectStudent(s)}>
                                ✅ Select
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Selected student banner */}
              {studentInfo && (
                <div className="alert alert-info py-2 mb-3">
                  👤 <strong>{studentInfo.name}</strong> | Reg: {studentInfo.regNo} | {studentInfo.gender} | 📱 {studentInfo.mobile}
                </div>
              )}

              {/* Calculate form */}
              {renderFeeForm(studentForm, setStudentForm, handleStudentPreview, studentLoading, false)}

              {/* Preview result */}
              {studentPreview && (
                <>
                  {renderFeeTable(studentPreview)}

                  <div className="border rounded p-3 mt-4 bg-light">
                    <h5 className="fw-bold mb-3">🔒 Lock Fee</h5>
                    <div className="mb-3">
                      <label className="form-label fw-bold">Remarks</label>
                      <input type="text" className="form-control" placeholder="Optional"
                        value={studentRemarks}
                        onChange={(e) => setStudentRemarks(e.target.value)} />
                    </div>
                    <button type="button" className="btn btn-success"
                      onClick={handleStudentLock} disabled={studentLocking}>
                      {studentLocking ? "Locking..." : "🔒 Lock Fee & Save"}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default FeeCalculate;
