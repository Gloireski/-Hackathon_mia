import { User } from "./user";

export interface LoginCredentials {
    email: string;
    password: string;
    rememberMe?: boolean;
}


export interface AuthResponse {
    tokens: {
        accessToken: string;
        // Add refresh token if you're using it
    };
    user: User;
}

export interface RegisterCredentials {
    email: string;
    password: string;
    name?: string;
    // Add other registration fields as needed
}

export interface ResetPasswordCredentials {
    email: string;
}

export interface UpdatePasswordCredentials {
    currentPassword: string;
    newPassword: string;
}