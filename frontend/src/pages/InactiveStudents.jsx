import { useState, useEffect, useMemo } from "react";
import { getInactiveStudents, reactivateStudent } from "../services/api";
import { toast } from "react-toastify";

function InactiveStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Modal state ───────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [reactivating, setReactivating] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await getInactiveStudents();
      setStudents(res.data);
    } catch {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // ── Client-side search ────────────────────────────────────
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.regNo.toString().includes(q) ||
        (s.mobile && s.mobile.includes(q)),
    );
  }, [students, searchQuery]);

  // ── Modal handlers ────────────────────────────────────────
  const openModal = (student) => {
    setSelectedStudent(student);
    setRemarks("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (reactivating) return;
    setShowModal(false);
    setSelectedStudent(null);
    setRemarks("");
  };

  const handleConfirmReactivate = async () => {
    if (!selectedStudent) return;
    setReactivating(true);
    try {
      const res = await reactivateStudent({
        regNo: selectedStudent.regNo,
        remarks: remarks.trim() || null,
      });
      toast.success(res.data.message || "Student reactivated!");
      closeModal();
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reactivate");
    } finally {
      setReactivating(false);
    }
  };

  return (
    <div>
      <h2 className="page-title">
        👥 Inactive Students{" "}
        {!loading && (
          <span className="fs-6 fw-normal text-muted">
            ({students.length} total)
          </span>
        )}
      </h2>

      {/* ── Search ───────────────────────────────────────── */}
      <div className="mb-3 col-lg-4">
        <input
          type="text"
          className="form-control"
          placeholder="Search by name, reg no, mobile..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center mt-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2 text-muted">Loading students...</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-custom table-hover align-middle">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Reg No</th>
                <th>Name</th>
                <th>Gender</th>
                <th>Mobile</th>
                <th>Time Slot</th>
                <th>Deactivated</th>
                <th>Reason</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-5 text-muted">
                    <div className="fs-5">📭</div>
                    {searchQuery
                      ? "No students match your search"
                      : "No inactive students found"}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => (
                  <tr key={s.regNo}>
                    <td className="text-muted">{idx + 1}</td>
                    <td className="fw-bold">{s.regNo}</td>
                    <td>{s.name}</td>
                    <td>
                      <span
                        className={`badge ${
                          s.gender === "Male" ? "bg-primary" : "bg-danger"
                        }`}
                      >
                        {s.gender}
                      </span>
                    </td>
                    <td>{s.mobile || "—"}</td>
                    <td>
                      {s.inTime && s.outTime ? (
                        <span className="badge bg-secondary">
                          {s.inTime} - {s.outTime}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>{s.deactivationDate || "—"}</td>
                    <td
                      style={{ maxWidth: "150px" }}
                      className="text-truncate"
                      title={s.remarks || ""}
                    >
                      {s.remarks || "—"}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-success"
                        onClick={() => openModal(s)}
                      >
                        🟢 Reactivate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Reactivate Modal ──────────────────────────────── */}
      {showModal && (
        <>
          <div className="modal-backdrop fade show" onClick={closeModal} />
          <div className="modal fade show d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header border-success">
                  <h5 className="modal-title text-success fw-bold">
                    🟢 Reactivate Student
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={closeModal}
                    disabled={reactivating}
                  />
                </div>

                <div className="modal-body">
                  <p className="mb-3">
                    Are you sure you want to reactivate{" "}
                    <strong>{selectedStudent?.name}</strong>{" "}
                    <span className="text-muted">
                      (Reg No: {selectedStudent?.regNo})
                    </span>
                    ?
                  </p>
                  <div className="alert alert-info py-2 small mb-3">
                    ℹ️ Student will move back to Active Students. Seat booking
                    will need to be done manually.
                  </div>
                  <div>
                    <label className="form-label fw-semibold">
                      Reason / Remarks{" "}
                      <span className="text-muted fw-normal">(optional)</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="e.g. Rejoined after break..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      disabled={reactivating}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={closeModal}
                    disabled={reactivating}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={handleConfirmReactivate}
                    disabled={reactivating}
                  >
                    {reactivating ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                        />
                        Reactivating...
                      </>
                    ) : (
                      "🟢 Yes, Reactivate"
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

export default InactiveStudents;
