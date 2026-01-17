// =============================
// CAYNANA API CONFIG (FINAL)
// =============================

// API base
export const BASE_DOMAIN = "https://caynana-api-py310-final.onrender.com";

// Endpoints
export const API_CHAT = `${BASE_DOMAIN}/api/chat`;
export const API_HEALTH = `${BASE_DOMAIN}/healthz`;

// Default headers (token sonradan eklenir)
export const DEFAULT_HEADERS = {
  "Content-Type": "application/json"
};

// Timeout (ms)
export const REQUEST_TIMEOUT = 30000;
