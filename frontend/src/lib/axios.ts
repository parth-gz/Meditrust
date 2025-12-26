import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosHeaders,
} from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: false,
});

// ----------------------
// REQUEST INTERCEPTOR
// ----------------------
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");

    // Ensure headers object exists
    if (!config.headers) {
      config.headers = new AxiosHeaders();
    } else if (!(config.headers instanceof AxiosHeaders)) {
      config.headers = new AxiosHeaders(config.headers);
    }

    // Attach JWT correctly
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }

    // Only set JSON headers if NOT FormData
    if (!(config.data instanceof FormData)) {
      config.headers.set("Accept", "application/json");
      if (config.method !== "get") {
        config.headers.set("Content-Type", "application/json");
      }
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// ----------------------
// RESPONSE INTERCEPTOR
// ----------------------
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      /**
       * IMPORTANT:
       * Do NOT hard redirect here.
       * Just clear auth and let React routing handle it.
       */
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }

    return Promise.reject(error);
  }
);

export default api;
