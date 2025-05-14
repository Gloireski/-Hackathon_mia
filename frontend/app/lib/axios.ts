import axios from 'axios';
import { getAccessToken, setAccessToken, getAuthFailed } from './tokenUtils';

const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;

const instance = axios.create({
  baseURL: serverUrl,
  withCredentials: true,
});

instance.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

instance.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalConfig = err.config;

    if (err.response?.status === 401 && !originalConfig._retry) {
      // 🚫 Si l'auth a échoué, ne pas faire de refresh
      if (getAuthFailed()) {
        return Promise.reject(err);
      }

      originalConfig._retry = true;
      try {
        const res = await axios.post(`${serverUrl}/api/auth/refresh-token`, {}, {
          withCredentials: true,
        });
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
