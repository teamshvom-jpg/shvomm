/**
 * API client for interacting with the Shvom FastAPI backend.
 */

const envUrl = import.meta.env.VITE_API_URL;
const API_BASE = envUrl ? `${envUrl.replace(/\/$/, "")}/api` : "/api";

export async function fetchQuestions() {
  const res = await fetch(`${API_BASE}/questions`);
  if (!res.ok) throw new Error("Failed to load designer schema");
  return res.json();
}

export async function getPriceEstimate(payload) {
  const res = await fetch(`${API_BASE}/estimate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Failed to calculate estimate");
  return res.json();
}

function extractErrorMessage(errorData, fallback) {
  if (!errorData) return fallback;
  if (typeof errorData.detail === "string") return errorData.detail;
  if (Array.isArray(errorData.detail)) {
    return errorData.detail
      .map((item) => {
        const field = item.loc ? item.loc[item.loc.length - 1] : "Field";
        return `${field}: ${item.msg}`;
      })
      .join(", ");
  }
  if (errorData.message && typeof errorData.message === "string") {
    return errorData.message;
  }
  return fallback;
}

export async function submitGiftRequest(payload) {
  try {
    const res = await fetch(`${API_BASE}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(extractErrorMessage(errorData, "Failed to submit commission request"));
    }
    return await res.json();
  } catch (err) {
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      throw new Error("Unable to connect to the Shvom atelier backend server. Please verify the server is running.");
    }
    throw err;
  }
}

export async function uploadAssetFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/uploads`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Asset upload failed");
  }
  return res.json();
}

export async function bookConsultation(payload) {
  const res = await fetch(`${API_BASE}/consultations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to book consultation");
  }
  return res.json();
}

export function getPdfUrl(identifier) {
  return `${API_BASE}/requests/${identifier}/pdf`;
}

// Safe JSON response parser that catches HTML 404/500/SPA rewrites gracefully
async function parseJsonResponse(res, fallbackMessage = "Request failed") {
  const rawText = await res.text();
  let data = null;

  try {
    data = JSON.parse(rawText);
  } catch {
    data = null;
  }

  if (!data || rawText.trim().startsWith("<") || rawText.includes("<!DOCTYPE")) {
    if (!res.ok) {
      throw new Error(
        `Backend API unreachable (HTTP ${res.status}). Verify that the backend is running and routed.`
      );
    }
    throw new Error(
      `API endpoint returned an HTML page instead of JSON. Ensure the backend server is deployed and VITE_API_URL or reverse proxy is configured.`
    );
  }

  if (!res.ok) {
    const errorMsg = extractErrorMessage(data, fallbackMessage);
    throw new Error(errorMsg);
  }

  return data;
}

// Admin API
export async function adminLogin(username, password) {
  try {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    return await parseJsonResponse(res, "Invalid concierge credentials");
  } catch (err) {
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      throw new Error("Unable to connect to the backend server. Please verify the API is running.");
    }
    throw err;
  }
}

export async function fetchAdminRequests(token, { status, search, limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (status && status !== "All") params.append("status", status);
  if (search) params.append("search", search);
  params.append("limit", limit);
  params.append("offset", offset);

  const res = await fetch(`${API_BASE}/admin/requests?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return parseJsonResponse(res, "Failed to fetch requests");
}

export async function fetchAdminStats(token) {
  const res = await fetch(`${API_BASE}/admin/stats`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return parseJsonResponse(res, "Failed to fetch dashboard stats");
}

export async function updateRequestStatus(token, id, status, adminNotes) {
  const res = await fetch(`${API_BASE}/admin/requests/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ status, admin_notes: adminNotes })
  });
  return parseJsonResponse(res, "Failed to update status");
}

export async function createCashfreeOrder(payload) {
  try {
    const res = await fetch(`${API_BASE}/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return await parseJsonResponse(res, "Failed to initiate Cashfree payment session");
  } catch (err) {
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      throw new Error("Unable to connect to the Shvom server. Please try again.");
    }
    throw err;
  }
}

export async function verifyCashfreePayment(orderId) {
  try {
    const res = await fetch(`${API_BASE}/verify-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId })
    });
    return await parseJsonResponse(res, "Payment verification failed");
  } catch (err) {
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      throw new Error("Unable to verify payment with the Shvom server.");
    }
    throw err;
  }
}

// Order Tracking API
export async function trackOrder(identifier) {
  const clean = encodeURIComponent(identifier.trim());
  const res = await fetch(`${API_BASE}/track/${clean}`);
  return parseJsonResponse(res, "Order not found");
}

export async function fetchBalanceDue(identifier) {
  const clean = encodeURIComponent(identifier.trim());
  const res = await fetch(`${API_BASE}/balance/${clean}`);
  return parseJsonResponse(res, "No order or invoice found for that ID");
}

export async function updateTracking(token, reqId, trackingData) {
  const res = await fetch(`${API_BASE}/admin/requests/${reqId}/tracking`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(trackingData)
  });
  return parseJsonResponse(res, "Failed to update tracking");
}

export async function fetchAdminPayments(token, params = {}) {
  const query = new URLSearchParams();
  if (params.status && params.status !== "All") query.set("status", params.status);
  if (params.search) query.set("search", params.search);

  const res = await fetch(`${API_BASE}/admin/payments?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return parseJsonResponse(res, "Failed to fetch payments");
}

export async function createAdminBill(token, billData) {
  const res = await fetch(`${API_BASE}/admin/bills`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(billData)
  });
  return parseJsonResponse(res, "Failed to record bill");
}

export async function updatePaymentTracking(token, paymentId, trackingData) {
  const res = await fetch(`${API_BASE}/admin/payments/${paymentId}/tracking`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(trackingData)
  });
  return parseJsonResponse(res, "Failed to update payment tracking");
}

export async function fetchOrderDetails(identifier) {
  const clean = encodeURIComponent(identifier.trim());
  const res = await fetch(`${API_BASE}/orders/${clean}`);
  return parseJsonResponse(res, "No order found for that ID");
}

export async function addItemToOrder(payload) {
  try {
    const res = await fetch(`${API_BASE}/orders/add-item`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await parseJsonResponse(res, "Failed to add item to existing order");
  } catch (err) {
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      throw new Error("Unable to connect to the Shvom server. Please try again.");
    }
    throw err;
  }
}

export async function submitPayment(payload) {
  try {
    const res = await fetch(`${API_BASE}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return await parseJsonResponse(res, "Payment submission failed");
  } catch (err) {
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      throw new Error("Unable to connect to the Shvom server. Please try again.");
    }
    throw err;
  }
}


