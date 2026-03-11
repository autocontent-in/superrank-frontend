import axios from "axios";

// Create an Axios instance
const AiApi = axios.create({
  baseURL: import.meta.env.VITE_APP_AI_API,
  // timeout: 5000, // Optional: Set timeout for requests
});

// Add a request interceptor to attach headers (e.g., API key, token)
AiApi.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("ks-token") || sessionStorage.getItem("ks-token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`; // Add token to Authorization header
    }

    // Don't override Content-Type for FormData (file uploads)
    if (config.data instanceof FormData) {
      // Remove Content-Type header to let browser set it with boundary for FormData
      delete config.headers["Content-Type"];
    }

    // Optional: Add custom headers (e.g., API keys)
    // config.headers["X-API-KEY"] = "your-api-key"; // Replace with your API key if applicable
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle global errors
AiApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle unauthorized or global errors
    if (error.response && error.response.status === 401) {
      // Only redirect if we're not already on the login page
      if (window.location.pathname !== "/login") {
        localStorage.removeItem("ks-token");
        localStorage.removeItem("ks-token-expiry");
        sessionStorage.removeItem("ks-token");
        window.location.href = "/login"; // Redirect to login on 401 Unauthorized
      }
    }
    return Promise.reject(error);
  }
);

/**
 * POST request that returns a fetch Response for streaming (axios does not support streaming in browser).
 * Use response.body.getReader() to consume the stream.
 *
 * Usage: AiApi.streamPost("/ai/ask/stream", { prompt }, { signal })
 */
AiApi.streamPost = async function (endpoint, body, options = {}) {
  const baseURL = this.defaults.baseURL || import.meta.env.VITE_APP_AI_API || "";
  const token =
    localStorage.getItem("ks-token") || sessionStorage.getItem("ks-token");
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const url = endpoint.startsWith("http") ? endpoint : `${baseURL}${endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    ...options,
  });
  return res;
};

export default AiApi;
