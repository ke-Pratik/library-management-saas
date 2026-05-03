import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api",
});

// ═══════════════════════════════════════════
// STUDENT APIs
// ═══════════════════════════════════════════
export const registerStudent = (data) => API.post("/students/register", data);
export const getActiveStudents = () => API.get("/students/active");
export const getInactiveStudents = () => API.get("/students/inactive");
export const getStudentSummary = () => API.get("/students/summary");
export const deactivateStudent = (data) =>
  API.put("/students/deactivate", data);
export const reactivateStudent = (data) =>
  API.put("/students/reactivate", data);
export const searchStudents = (name) =>
  API.get("/students/search", { params: { name } }); // NEW

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

// ═══════════════════════════════════════════
// FEE APIs
// ═══════════════════════════════════════════
export const previewFee = (data) => API.post("/fees/preview", data);
export const lockFee = (data) => API.post("/fees/lock", data);
export const recordPayment = (data) => API.post("/fees/pay", data);
export const getStudentFeeStatus = (regNo) => API.get(`/fees/student/${regNo}`);
export const getAllFeeStatus = (params) => API.get("/fees/status", { params });
export const getMonthlyCollection = (params) =>
  API.get("/fees/collection/monthly", { params });
export const getCollectionByRange = (params) =>
  API.get("/fees/collection/range", { params });

export default API;
