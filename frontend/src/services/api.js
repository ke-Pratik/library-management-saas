import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api",
});

// Attach JWT token to every request automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If backend returns 401 (token expired / invalid) → auto logout
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      localStorage.removeItem("role");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);


// ═══════════════════════════════════════════
// STUDENT APIs
// ═══════════════════════════════════════════
export const registerStudent = (data) => API.post("/students/register", data);
export const getActiveStudents = (params) => API.get("/students/active", { params });
//export const getActiveStudents = () => API.get("/students/active");
export const getInactiveStudents = () => API.get("/students/inactive");
export const getStudentSummary = () => API.get("/students/summary");
export const deactivateStudent = (data) =>
  API.put("/students/deactivate", data);
export const reactivateStudent = (data) =>
  API.put("/students/reactivate", data);
export const searchStudents = (type, value) =>
  API.get("/students/search", { params: { type, value } });
export const getStudentByRegNo = (regNo) => API.get(`/students/${regNo}`);
export const editStudent       = (regNo, data) => API.put(`/students/${regNo}`, data);

// ═══════════════════════════════════════════
// SEAT APIs
// ═══════════════════════════════════════════
export const checkSeat = (params) => API.get("/seats/check", { params });
export const getVacantSeats = (params) => API.get("/seats/vacant", { params });
export const getSeatStatus = () => API.get("/seats/status");
export const allotSeat = (data) => API.post("/seats/allot", data);
export const cancelBooking = (bookingId) =>
  API.delete(`/seats/cancel/${bookingId}`);
export const getStudentBookings = (regNo) => API.get(`/seats/student/${regNo}`);
export const checkSeatAvailability = (params) =>
  API.get("/seats/availability", {
    params,
  });

// ═══════════════════════════════════════════
// FEE APIs
// ═══════════════════════════════════════════
export const previewFee = (data) => API.post("/fees/preview", data);
export const lockFee = (data) => API.post("/fees/lock", data);
export const autoGenerateFee      = (regNo)  => API.post(`/fees/auto-generate/${regNo}`);
export const recordPayment = (data) => API.post("/fees/pay", data);
export const getStudentFeeStatus = (regNo) => API.get(`/fees/student/${regNo}`);
export const getAllFeeStatus = (params) => API.get("/fees/status", { params });
export const getMonthlyCollection = (params) =>
  API.get("/fees/collection/monthly", { params });
export const getCollectionByRange = (params) =>
  API.get("/fees/collection/range", { params });
// ── ENHANCEMENT #2: Bulk generate fees for all active students ──
export const generateAllFees = (params) => API.post("/fees/generate-all", null, { params });
// ── ENHANCEMENTS #3–6 ──────────────────────────────────────────────
export const getStudentsWithNoConfig = () => API.get("/fees/no-config");
export const bulkPayment = (data) => API.post("/fees/bulk-payment", data);
export const reversePayment = (feeId, data) =>
  API.post(`/fees/reverse/${feeId}`, data);
export const getReceipt = (receiptNumber) =>
  API.get(`/fees/receipt/${receiptNumber}`);

//Enhancement 28 MAY 
export const reviseFee           = (feeId, data) => API.put(`/fees/${feeId}/revise`, data);
export const getFeeAdjustments   = (feeId)       => API.get(`/fees/${feeId}/adjustments`);
export const slotChange          = (data)        => API.post(`/fees/slot-change`, data);
export const advancePayment      = (data)        => API.post(`/fees/advance-payment`, data);
export const getWallet           = (regNo)       => API.get(`/students/${regNo}/wallet`);
export const getWalletTx         = (regNo)       => API.get(`/students/${regNo}/wallet/transactions`);
export const refundWalletCash    = (regNo, data) => API.post(`/students/${regNo}/wallet/refund-cash`, data);
export const getActiveConfig = (regNo) => API.get(`/fees/active-config/${regNo}`);
export const getActiveStudentsFilterCounts = () => API.get("/students/active/counts");

// ═══════════════════════════════════════════
// SYSADMIN API (separate token)
// ═══════════════════════════════════════════
export const sysadminApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api",
});

sysadminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("sysadmin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Rewrite "/tenants" → "/sysadmin/tenants" etc. since the controller is at /api/sysadmin
  if (config.url && !config.url.startsWith("/sysadmin")) {
    config.url = "/sysadmin" + config.url;
  }
  return config;
});

sysadminApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("sysadmin_token");
      localStorage.removeItem("sysadmin_username");
      window.location.href = "/sysadmin/login";
    }
    return Promise.reject(err);
  },
);

export default API;
