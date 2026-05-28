import { useState, useEffect, useCallback } from "react";
import {
  getActiveStudents,
  deactivateStudent,
  getStudentByRegNo,
  editStudent,
} from "../services/api";
import { toast } from "react-toastify";
import SlotChangeModal from "../components/SlotChangeModal";

const PAGE_SIZE = 10;

function ActiveStudents() {
  const [students, setStudents]           = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages]       = useState(0);
  const [page, setPage]                   = useState(0);
  const [loading, setLoading]             = useState(true);

  // ── Row dropdown state (which row's menu is open) ─────────────
  const [openMenuRegNo, setOpenMenuRegNo] = useState(null);

  // ── Deactivate modal ──────────────────────────────────────────
  const [showDeactivate, setShowDeactivate]       = useState(false);
  const [deactivateTarget, setDeactivateTarget]   = useState(null);
  const [deactivateRemarks, setDeactivateRemarks] = useState("");
  const [deactivating, setDeactivating]           = useState(false);

  // ── Edit modal ────────────────────────────────────────────────
  const [showEdit, setShowEdit]       = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving]   = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);
  const [editRegNo, setEditRegNo]     = useState(null);
  const [editForm, setEditForm] = useState({
    name: "", fatherName: "", aadhaarNo: "",
    gender: "", address: "", mobile: "", remarks: "",
  });

  // ── Slot change modal target ──────────────────────────────────
  const [slotTarget, setSlotTarget] = useState(null);

  // ── Fetch active students ─────────────────────────────────────
  const fetchStudents = useCallback(async (pageNum) => {
    setLoading(true);
    try {
      const res = await getActiveStudents({ page: pageNum, size: PAGE_SIZE });
      setStudents(res.data.students);
      setTotalElements(res.data.totalElements);
      setTotalPages(res.data.totalPages);
    } catch {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStudents(page); }, [page, fetchStudents]);

  // ── Close dropdown on outside click ───────────────────────────
  useEffect(() => {
    const handler = () => setOpenMenuRegNo(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // ── Deactivate handlers ───────────────────────────────────────
  const openDeactivate = (s) => {
    setOpenMenuRegNo(null);
    setDeactivateTarget(s);
    setDeactivateRemarks("");
    setShowDeactivate(true);
  };
  const closeDeactivate = () => {
    if (deactivating) return;
    setShowDeactivate(false);
    setDeactivateTarget(null);
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      const res = await deactivateStudent({
        regNo: deactivateTarget.regNo,
        remarks: deactivateRemarks.trim() || null,
      });
      toast.success(res.data.message || "Student deactivated");
      closeDeactivate();
      fetchStudents(page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to deactivate");
    } finally {
      setDeactivating(false);
    }
  };

  // ── Edit handlers ─────────────────────────────────────────────
  const openEdit = async (s) => {
    setOpenMenuRegNo(null);
    setEditRegNo(s.regNo);
    setEditSuccess(false);
    setEditLoading(true);
    setShowEdit(true);
    try {
      const res = await getStudentByRegNo(s.regNo);
      const d   = res.data;
      setEditForm({
        name:       d.name       || "",
        fatherName: d.fatherName || "",
        aadhaarNo:  d.aadhaarNo  || "",
        gender:     d.gender     || "",
        address:    d.address    || "",
        mobile:     d.mobile     || "",
        remarks:    d.remarks    || "",
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load student data");
      setShowEdit(false);
    } finally {
      setEditLoading(false);
    }
  };

  const closeEdit = () => {
    if (editSaving) return;
    setShowEdit(false);
    setEditSuccess(false);
    setEditRegNo(null);
  };

  const handleEditChange = (e) =>
    setEditForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submitEdit = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      const res = await editStudent(editRegNo, {
        name:       editForm.name.trim(),
        fatherName: editForm.fatherName.trim() || null,
        aadhaarNo:  editForm.aadhaarNo.trim(),
        gender:     editForm.gender,
        address:    editForm.address.trim(),
        mobile:     editForm.mobile.trim(),
        remarks:    editForm.remarks.trim() || null,
      });
      toast.success(res.data.message || "Student updated");
      setEditSuccess(true);
      fetchStudents(page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update student");
    } finally {
      setEditSaving(false);
    }
  };

  // ── Slot change handler ───────────────────────────────────────
  const openSlotChange = (s) => {
    setOpenMenuRegNo(null);
    setSlotTarget(s);
  };

  // ── Toggle row dropdown ───────────────────────────────────────
  const toggleMenu = (e, regNo) => {
    e.stopPropagation();
    setOpenMenuRegNo((cur) => (cur === regNo ? null : regNo));
  };

  // ── Fee status badge ──────────────────────────────────────────
  const feeStatusBadge = (status) => {
    if (status === "PAID")
      return <span className="badge bg-success">✅ PAID</span>;
    if (status === "PARTIAL")
      return <span className="badge bg-warning text-dark">🔶 PARTIAL</span>;
    return <span className="badge bg-danger">🔴 DUES</span>;
  };

  return (
    <div>
      <h2 className="page-title">
        👥 Active Students{" "}
        {!loading && <span className="fs-6 fw-normal text-muted">({totalElements} total)</span>}
      </h2>

      {loading ? (
        <div className="text-center mt-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2 text-muted">Loading students...</p>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-custom table-hover align-middle">
              <thead>
                <tr>
                  <th>S.No</th><th>Reg No</th><th>Name</th><th>Gender</th>
                  <th>Mobile</th><th>Seat No</th><th>Time Slot</th>
                  <th>Fee Status</th><th>Admission</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr><td colSpan="10" className="text-center py-5 text-muted"><div className="fs-5">📭</div>No active students found</td></tr>
                ) : (
                  students.map((s, idx) => {
                    const isNearBottom = idx >= students.length - 2;

                    return (
                      <tr key={s.regNo}>
                        <td className="text-muted">{page * PAGE_SIZE + idx + 1}</td>
                        <td className="fw-bold">{s.regNo}</td>
                        <td>{s.name}</td>
                        <td>
                          <span className={`badge ${s.gender === "Male" ? "bg-primary" : "bg-danger"}`}>
                            {s.gender}
                          </span>
                        </td>
                        <td>{s.mobile}</td>
                        <td>
                          {s.seatNo > 0
                            ? <span className="badge bg-info text-dark fw-bold">{s.seatNo}</span>
                            : <span className="text-muted">—</span>}
                        </td>
                        <td>
                          {s.timeSlot
                            ? <span className="badge bg-success">{s.timeSlot}</span>
                            : <span className="text-muted">Not set</span>}
                        </td>
                        <td>{feeStatusBadge(s.feeStatus)}</td>
                        <td>{s.dateOfAdmission}</td>

                        <td>
                          <div className="d-flex gap-2 align-items-center">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => openEdit(s)}
                            >
                              ✏️ Edit
                            </button>

                            <div style={{ position: "relative" }}>
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={(e) => toggleMenu(e, s.regNo)}
                                title="More actions"
                                style={{ minWidth: "32px" }}
                              >
                                ⋮
                              </button>

                              {openMenuRegNo === s.regNo && (
                                <ul
                                  className="dropdown-menu show shadow"
                                  style={{
                                    position: "absolute",
                                    right: 0,
                                    ...(isNearBottom
                                      ? { bottom: "100%", marginBottom: "4px" }
                                      : { top: "100%", marginTop: "4px" }),
                                    minWidth: "200px",
                                    zIndex: 1050,
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <li>
                                    <button
                                      className="dropdown-item"
                                      onClick={() => openSlotChange(s)}
                                    >
                                      🕐 Change Slot
                                    </button>
                                  </li>
                                  <li><hr className="dropdown-divider" /></li>
                                  <li>
                                    <button
                                      className="dropdown-item text-danger"
                                      onClick={() => openDeactivate(s)}
                                    >
                                      🔴 Deactivate
                                    </button>
                                  </li>
                                </ul>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
              <span className="text-muted small">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalElements)} of {totalElements} students
              </span>
              <div className="d-flex align-items-center gap-2">
                <button className="btn btn-sm btn-outline-secondary" disabled={page === 0} onClick={() => setPage(0)}>« First</button>
                <button className="btn btn-sm btn-outline-primary"   disabled={page === 0} onClick={() => setPage((p) => p - 1)}>‹ Prev</button>
                <span className="badge bg-secondary px-3 py-2">{page + 1} / {totalPages}</span>
                <button className="btn btn-sm btn-outline-primary"   disabled={page === totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next ›</button>
                <button className="btn btn-sm btn-outline-secondary" disabled={page === totalPages - 1} onClick={() => setPage(totalPages - 1)}>Last »</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Deactivate Modal ──────────────────────────────────── */}
      {showDeactivate && (
        <>
          <div className="modal-backdrop fade show" onClick={closeDeactivate} />
          <div className="modal fade show d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header border-danger">
                  <h5 className="modal-title text-danger fw-bold">🔴 Deactivate Student</h5>
                  <button type="button" className="btn-close" onClick={closeDeactivate} disabled={deactivating} />
                </div>
                <div className="modal-body">
                  <p className="mb-3">
                    Are you sure you want to deactivate <strong>{deactivateTarget?.name}</strong>{" "}
                    <span className="text-muted">(Reg No: {deactivateTarget?.regNo})</span>?
                  </p>
                  <div className="alert alert-warning py-2 small mb-3">
                    ⚠️ This will also <strong>cancel all seat bookings</strong> for this student.
                  </div>
                  <label className="form-label fw-semibold">
                    Reason / Remarks <span className="text-muted fw-normal">(optional)</span>
                  </label>
                  <textarea className="form-control" rows={3}
                    placeholder="e.g. Left city, completed course..."
                    value={deactivateRemarks}
                    onChange={(e) => setDeactivateRemarks(e.target.value)}
                    disabled={deactivating} />
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={closeDeactivate} disabled={deactivating}>Cancel</button>
                  <button className="btn btn-danger"    onClick={confirmDeactivate} disabled={deactivating}>
                    {deactivating ? <><span className="spinner-border spinner-border-sm me-2" />Deactivating...</> : "🔴 Yes, Deactivate"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Edit Modal ────────────────────────────────────────── */}
      {showEdit && (
        <>
          <div className="modal-backdrop fade show" onClick={closeEdit} />
          <div className="modal fade show d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
              <div className="modal-content">

                <div className="modal-header">
                  <h5 className="modal-title fw-bold">✏️ Edit Student — Reg No: {editRegNo}</h5>
                  <button type="button" className="btn-close" onClick={closeEdit} disabled={editSaving} />
                </div>

                <div className="modal-body">
                  {editLoading ? (
                    <div className="text-center py-4">
                      <div className="spinner-border text-primary" role="status" />
                      <p className="mt-2 text-muted">Loading student data...</p>
                    </div>

                  ) : editSuccess ? (
                    <div className="alert alert-success">
                      ✅ Student details updated successfully.
                    </div>

                  ) : (
                    <form id="editStudentForm" onSubmit={submitEdit}>
                      <div className="row g-3">

                        <div className="col-md-6">
                          <label className="form-label fw-semibold">Name <span className="text-danger">*</span></label>
                          <input type="text" className="form-control" name="name"
                            value={editForm.name} onChange={handleEditChange} required disabled={editSaving} />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label fw-semibold">Father's Name</label>
                          <input type="text" className="form-control" name="fatherName"
                            value={editForm.fatherName} onChange={handleEditChange} disabled={editSaving} />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label fw-semibold">Aadhaar No <span className="text-danger">*</span></label>
                          <input type="text" className="form-control" name="aadhaarNo"
                            value={editForm.aadhaarNo} onChange={handleEditChange}
                            maxLength={12} pattern="\d{12}" title="Must be exactly 12 digits"
                            required disabled={editSaving} />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label fw-semibold">Mobile <span className="text-danger">*</span></label>
                          <input type="text" className="form-control" name="mobile"
                            value={editForm.mobile} onChange={handleEditChange}
                            maxLength={10} pattern="\d{10}" title="Must be exactly 10 digits"
                            required disabled={editSaving} />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label fw-semibold">Gender <span className="text-danger">*</span></label>
                          <select className="form-select" name="gender"
                            value={editForm.gender} onChange={handleEditChange}
                            required disabled={editSaving}>
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </div>

                        <div className="col-12">
                          <label className="form-label fw-semibold">Address <span className="text-danger">*</span></label>
                          <textarea className="form-control" name="address" rows={2}
                            value={editForm.address} onChange={handleEditChange}
                            required disabled={editSaving} />
                        </div>

                        <div className="col-12">
                          <label className="form-label fw-semibold">Remarks</label>
                          <textarea className="form-control" name="remarks" rows={2}
                            value={editForm.remarks} onChange={handleEditChange}
                            disabled={editSaving} />
                        </div>

                      </div>
                    </form>
                  )}
                </div>

                <div className="modal-footer">
                  {editSuccess ? (
                    <button className="btn btn-primary" onClick={closeEdit}>Close</button>
                  ) : (
                    <>
                      <button className="btn btn-secondary" onClick={closeEdit} disabled={editSaving || editLoading}>Cancel</button>
                      <button type="submit" form="editStudentForm" className="btn btn-primary" disabled={editSaving || editLoading}>
                        {editSaving
                          ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</>
                          : "💾 Save Changes"}
                      </button>
                    </>
                  )}
                </div>

              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Slot Change Modal — KEEP OPEN AFTER SAVE so admin sees result ── */}
      {slotTarget && (
        <SlotChangeModal
          student={slotTarget}
          onClose={() => setSlotTarget(null)}
          onSaved={() => {
            // 🔧 FIX: do NOT setSlotTarget(null) here — modal must stay open to show result panel
            fetchStudents(page);
          }}
        />
      )}
    </div>
  );
}

export default ActiveStudents;
