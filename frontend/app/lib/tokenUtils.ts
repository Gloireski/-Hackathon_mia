let accessToken: string | null = null;
let authFailed = false;

export const getAccessToken = () => accessToken;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const setAuthFailed = (state: boolean) => {
  authFailed = state;
};

export const getAuthFailed = () => authFailed;
