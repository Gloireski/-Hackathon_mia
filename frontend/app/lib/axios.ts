// lib/axios.ts
import axios from "axios";
import { getAccessToken, setAccessToken } from "./tokenUtils"; // utility we'll define

const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;

const instance = axios.create({
  baseURL: serverUrl,
  withCredentials: true,
});

// Request interceptor to add token
instance.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to refresh token if expired
instance.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalConfig = err.config;
    if (err.response?.status === 401 && !originalConfig._retry) {
      originalConfig._retry = true;
      try {
        const res = await axios.post(
          'api/auth/refresh-token',
          {},
          { withCredentials: true }
        );
        const newToken = res.data.accessToken;
        setAccessToken(newToken);
        originalConfig.headers.Authorization = `Bearer ${newToken}`;
        return axios(originalConfig);
      } catch (refreshErr) {
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(err);
  }
);

export default instance;
