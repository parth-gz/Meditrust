import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosHeaders,
} from "axios";

const api = axios.create({
  baseURL: "http://10.213.240.44:5000/api",
});

// ----------------------
// REQUEST INTERCEPTOR
// ----------------------
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");

    // Ensure headers ALWAYS exist and are correctly typed
    if (!config.headers) {
      config.headers = new AxiosHeaders();
    } else if (!(config.headers instanceof AxiosHeaders)) {
      config.headers = new AxiosHeaders(config.headers);
    }

    // Attach JWT safely
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }

    const isFormData = config.data instanceof FormData;

    if (!isFormData) {
      config.headers.set("Content-Type", "application/json");
      config.headers.set("Accept", "application/json");
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// ----------------------
// RESPONSE INTERCEPTOR
// ----------------------
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
