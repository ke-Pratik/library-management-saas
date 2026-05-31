import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function SysadminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api"}/sysadmin/auth/login`,
        form
      );
      localStorage.setItem("sysadmin_token", res.data.token);
      localStorage.setItem("sysadmin_username", res.data.username);
      navigate("/sysadmin/tenants");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 bg-dark">
      <div className="card shadow-lg border-0" style={{ width: 380 }}>
        <div className="card-header bg-danger text-white text-center py-3">
          <h5 className="mb-0 fw-bold">Sysadmin Login</h5>
        </div>
        <div className="card-body p-4">
          {error && <div className="alert alert-danger py-2 small">{error}</div>}
          <form onSubmit={submit}>
            <div className="mb-3">
              <label className="form-label small fw-bold">Username</label>
              <input className="form-control" value={form.username}
                     onChange={(e) => setForm({ ...form, username: e.target.value })} required autoFocus />
            </div>
            <div className="mb-3">
              <label className="form-label small fw-bold">Password</label>
              <input type="password" className="form-control" value={form.password}
                     onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <button className="btn btn-danger w-100 fw-bold" disabled={loading}>
              {loading ? "..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SysadminLogin;
