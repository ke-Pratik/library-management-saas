import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { FaBook, FaLock, FaUser } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm]       = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [warmingUp, setWarmingUp] = useState(false);
  const slowTimerRef = useRef(null);

  // ── Wake up backend on page load (Render free-tier cold start fix) ──
  useEffect(() => {
    axios.get(`${API_BASE}/auth/health`, { timeout: 60000 })
      .catch(() => { /* silent — backend will wake up eventually */ });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setWarmingUp(false);

    // If the request takes > 5 seconds, show a "waking up server" hint
    slowTimerRef.current = setTimeout(() => setWarmingUp(true), 5000);

    try {
      const response = await axios.post(
        `${API_BASE}/auth/login`,
        form,
        { timeout: 60000 }   // 60s timeout for cold start
      );

      // ── DEFENSIVE CHECK: validate response shape before using ──
      if (!response?.data?.token) {
        throw new Error("Server returned an invalid response. Please try again.");
      }

      login(response.data.token, {
        username: response.data.username,
        role: response.data.role,
        tenantId: response.data.tenantId,
        libraryName: response.data.libraryName,
        onboarded: response.data.onboarded,
      });
      navigate(response.data.onboarded ? "/" : "/onboarding");
    } catch (err) {
      // Distinguish between cold-start timeout and real auth failure
      if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
        setError("Server is taking too long to respond. Please try again in a moment.");
      } else if (err.message?.includes("Network Error")) {
        setError("Can't reach the server. Please check your internet and try again.");
      } else {
        setError(
          err.response?.data?.message ||
          err.response?.data?.error   ||
          err.message ||
          "Invalid credentials"
        );
      }
    } finally {
      clearTimeout(slowTimerRef.current);
      setWarmingUp(false);
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light">
      <div className="card shadow-lg border-0" style={{ width: "400px" }}>
        <div className="card-header text-white text-center py-4"
             style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)" }}>
          <FaBook size={36} className="mb-2" />
          <h4 className="mb-0 fw-bold">Library Management</h4>
          <small className="opacity-75">Management System</small>
        </div>

        <div className="card-body p-4">
          <h5 className="text-center mb-4 text-muted">Login</h5>

          {error && (
            <div className="alert alert-danger py-2 text-center small">{error}</div>
          )}

          {warmingUp && !error && (
            <div className="alert alert-info py-2 text-center small">
              <span className="spinner-border spinner-border-sm me-2" />
              Server is waking up... please wait a few seconds.
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-bold">
                <FaUser className="me-1" /> Username or Email
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="a1library  or  owner@example.com"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                autoFocus
                autoComplete="username"
                disabled={loading}
              />
              <small className="text-muted">
                Owners can use either. Staff: use the username your owner shared.
              </small>
            </div>

            <div className="mb-4">
              <label className="form-label fw-bold"><FaLock className="me-1" /> Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Enter password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn btn-primary w-100 py-2 fw-bold" disabled={loading}>
              {loading
                ? <><span className="spinner-border spinner-border-sm me-2" />Logging in...</>
                : "Login"}
            </button>
          </form>

          <div className="text-center mt-3 small">
            New here? <Link to="/signup">Create a library</Link>
          </div>
        </div>

        <div className="card-footer text-center text-muted small py-2">
          Authorized personnel only
        </div>
      </div>
    </div>
  );
}

export default Login;
