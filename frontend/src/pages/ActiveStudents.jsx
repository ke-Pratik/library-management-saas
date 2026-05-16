import { useState, useEffect, useCallback } from "react";
import { getActiveStudents, deactivateStudent } from "../services/api";
import { toast } from "react-toastify";

const PAGE_SIZE = 10;

function ActiveStudents() {
  const [students, setStudents] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  // ── Modal state ───────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null); // { regNo, name }
  const [remarks, setRemarks] = useState("");
  const [deactivating, setDeactivating] = useState(false);

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

  useEffect(() => {
    fetchStudents(page);
  }, [page, fetchStudents]);

  // ── Open modal ────────────────────────────────────────────
  const openDeactivateModal = (student) => {
    setSelectedStudent(student);
    setRemarks("");
    setShowModal(true);
  };

  // ── Close modal ───────────────────────────────────────────
  const closeModal = () => {
    if (deactivating) return;
    setShowModal(false);
    setSelectedStudent(null);
    setRemarks("");
  };

  // ── Confirm deactivation ──────────────────────────────────
  const handleConfirmDeactivate = async () => {
    if (!selectedStudent) return;
    setDeactivating(true);
    try {
      const res = await deactivateStudent({
        regNo: selectedStudent.regNo,
        remarks: remarks.trim() || null,
      });
      toast.success(res.data.message || "Student deactivated");
      closeModal();
      fetchStudents(page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to deactivate");
    } finally {
      setDeactivating(false);
    }
  };

  const feeStatusBadge = (status) =>
    status === "PAID" ? (
      <span className="badge bg-success">✅ PAID</span>
    ) : (
      <span className="badge bg-danger">🔴 DUES</span>
    );

  return (
    <div>
      <h2 className="page-title">
        👥 Active Students{" "}
        {!loading && (
          <span className="fs-6 fw-normal text-muted">
            ({totalElements} total)
          </span>
        )}
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
                  <th>S.No</th>
                  <th>Reg No</th>
                  <th>Name</th>
                  <th>Gender</th>
                  <th>Mobile</th>
                  <th>Seat No</th>
                  <th>Time Slot</th>
                  <th>Fee Status</th>
                  <th>Admission</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-5 text-muted">
                      <div className="fs-5">📭</div>
                      No active students found
                    </td>
                  </tr>
                ) : (
                  students.map((s, idx) => (
                    <tr key={s.regNo}>
                      <td className="text-muted">
                        {page * PAGE_SIZE + idx + 1}
                      </td>
                      <td className="fw-bold">{s.regNo}</td>
                      <td>{s.name}</td>
                      <td>
                        <span
                          className={`badge ${s.gender === "Male" ? "bg-primary" : "bg-danger"}`}
                        >
                          {s.gender}
                        </span>
                      </td>
                      <td>{s.mobile}</td>
                      <td>
                        {s.seatNo > 0 ? (
                          <span className="badge bg-info text-dark fw-bold">
                            {s.seatNo}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        {s.timeSlot ? (
                          <span className="badge bg-success">{s.timeSlot}</span>
                        ) : (
                          <span className="text-muted">Not set</span>
                        )}
                      </td>
                      <td>{feeStatusBadge(s.feeStatus)}</td>
                      <td>{s.dateOfAdmission}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => openDeactivateModal(s)}
                        >
                          🔴 Deactivate
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
              <span className="text-muted small">
                Showing {page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, totalElements)} of{" "}
                {totalElements} students
              </span>
              <div className="d-flex align-items-center gap-2">
                <button
                  className="btn btn-sm btn-outline-secondary"
                  disabled={page === 0}
                  onClick={() => setPage(0)}
                >
                  « First
                </button>
                <button
                  className="btn btn-sm btn-outline-primary"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ‹ Prev
                </button>
                <span className="badge bg-secondary px-3 py-2">
                  {page + 1} / {totalPages}
                </span>
                <button
                  className="btn btn-sm btn-outline-primary"
                  disabled={page === totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next ›
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  disabled={page === totalPages - 1}
                  onClick={() => setPage(totalPages - 1)}
                >
                  Last »
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Deactivate Confirmation Modal ───────────────────── */}
      {showModal && (
        <>
          {/* Backdrop */}
          <div className="modal-backdrop fade show" onClick={closeModal} />

          {/* Modal */}
          <div className="modal fade show d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                {/* Header */}
                <div className="modal-header border-danger">
                  <h5 className="modal-title text-danger fw-bold">
                    🔴 Deactivate Student
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={closeModal}
                    disabled={deactivating}
                  />
                </div>

                {/* Body */}
                <div className="modal-body">
                  <p className="mb-3">
                    Are you sure you want to deactivate{" "}
                    <strong>{selectedStudent?.name}</strong>{" "}
                    <span className="text-muted">
                      (Reg No: {selectedStudent?.regNo})
                    </span>
                    ?
                  </p>
                  <div className="alert alert-warning py-2 small mb-3">
                    ⚠️ This will also <strong>cancel all seat bookings</strong>{" "}
                    for this student.
                  </div>
                  <div>
                    <label className="form-label fw-semibold">
                      Reason / Remarks{" "}
                      <span className="text-muted fw-normal">(optional)</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="e.g. Left city, completed course..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      disabled={deactivating}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={closeModal}
                    disabled={deactivating}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={handleConfirmDeactivate}
                    disabled={deactivating}
                  >
                    {deactivating ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                        />
                        Deactivating...
                      </>
                    ) : (
                      "🔴 Yes, Deactivate"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ActiveStudents;
