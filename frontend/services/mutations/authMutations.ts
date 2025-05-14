'use client'
import axios from '@/app/lib/axios';
import { LoginCredentials, AuthResponse } from '@/types/auth';
import { AxiosError } from 'axios';

export const loginMutation = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
    
    try {
        const res = await axios.post(`${serverUrl}/api/auth/login`, {
            email: credentials.email,
            password: credentials.password
        }, { withCredentials: true });
        return res.data;
        
    } catch (error) {
        return handleAuthError(error);
    }
};

// Helper function to handle auth errors
const handleAuthError = (error: unknown): never => {
    if (error instanceof AxiosError && error.response) {
        const serverMessage = error.response.data.message || error.response.data.error;
        throw new Error(serverMessage || error.message);
    }
    throw error;
};