import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function PublicSignup() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    libraryName: "",
    ownerName: "",
    ownerEmail: "",
    ownerMobile: "",
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api"}/auth/signup`,
        form
      );
      login(res.data.token, {
        username: res.data.username,
        role: res.data.role,
        tenantId: res.data.tenantId,
        libraryName: res.data.libraryName,
        onboarded: res.data.onboarded,
      });
      navigate(res.data.onboarded ? "/" : "/onboarding");
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light">
      <div className="card shadow-lg border-0" style={{ width: 460 }}>
        <div className="card-header text-white text-center py-3"
             style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e)" }}>
          <h4 className="mb-0 fw-bold">Create your Library</h4>
          <small className="opacity-75">30-day free trial</small>
        </div>
        <div className="card-body p-4">
          {error && <div className="alert alert-danger py-2 small">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-2">
              <label className="form-label small fw-bold">Library Name</label>
              <input className="form-control" name="libraryName" value={form.libraryName} onChange={onChange} required />
            </div>
            <div className="mb-2">
              <label className="form-label small fw-bold">Owner Name</label>
              <input className="form-control" name="ownerName" value={form.ownerName} onChange={onChange} required />
            </div>
            <div className="mb-2">
              <label className="form-label small fw-bold">Owner Email</label>
              <input type="email" className="form-control" name="ownerEmail" value={form.ownerEmail} onChange={onChange} required />
            </div>
            <div className="mb-2">
              <label className="form-label small fw-bold">Owner Mobile</label>
              <input className="form-control" name="ownerMobile" value={form.ownerMobile} onChange={onChange} required />
            </div>
            <div className="mb-2">
              <label className="form-label small fw-bold">Login Username</label>
              <input className="form-control" name="username" value={form.username} onChange={onChange} required />
            </div>
            <div className="mb-3">
              <label className="form-label small fw-bold">Password (min 6)</label>
              <input type="password" className="form-control" name="password" value={form.password} onChange={onChange} required minLength={6} />
            </div>
            <button type="submit" className="btn btn-primary w-100 fw-bold" disabled={loading}>
              {loading ? "Creating..." : "Create Library"}
            </button>
          </form>
          <div className="text-center mt-3 small">
            Already have an account? <Link to="/login">Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PublicSignup;
