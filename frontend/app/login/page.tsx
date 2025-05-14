/**
 * Page de connexion
 * Permet à l'utilisateur de se connecter à l'application
 */
'use client';

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { useAuth } from '../context/AuthContext';
import { useUserContext } from '../context/UserContext'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { loginMutation } from '@/services/mutations/authMutations'
import { AuthResponse, LoginCredentials } from '@/types/auth'

interface ValidationErrors {
    email: string;
    password: string;
}

/**
 * Composant de la page de connexion
 * Gère le formulaire de connexion et l'authentification via GraphQL
 * 
 * @returns {JSX.Element} - Composant rendu
 */
export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({
        email: '',
        password: ''
    });

    const { setAccessToken, setIsLoggedIn, isLoggedIn, login } = useAuth()
    const { setUser } = useUserContext()
    const router = useRouter();

    // Check for remembered email
    useEffect(() => {
        const rememberedEmail = localStorage.getItem('rememberedEmail');
        if (rememberedEmail) {
            setEmail(rememberedEmail);
            setRememberMe(true);
        }
    }, []);

    const handleRememberMe = useCallback(() => {
        if (rememberMe) {
            localStorage.setItem('rememberedEmail', email);
        } else {
            localStorage.removeItem('rememberedEmail');
        }
    }, [rememberMe, email]);

    const mutation = useMutation<AuthResponse, Error, LoginCredentials>({
        mutationFn: loginMutation
    });

    const validateEmail = (email: string): boolean => {
        if (!email) {
            setValidationErrors(prev => ({ ...prev, email: 'Email is required' }));
            return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setValidationErrors(prev => ({ ...prev, email: 'Please enter a valid email' }));
            return false;
        }
        setValidationErrors(prev => ({ ...prev, email: '' }));
        return true;
    };

    const validatePassword = (password: string): boolean => {
        if (!password) {
            setValidationErrors(prev => ({ ...prev, password: 'Password is required' }));
            return false;
        }
        if (password.length < 6) {
            setValidationErrors(prev => ({ ...prev, password: 'Password must be at least 6 characters' }));
            return false;
        }
        setValidationErrors(prev => ({ ...prev, password: '' }));
        return true;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (isSubmitting) return;

        const isEmailValid = validateEmail(email);
        const isPasswordValid = validatePassword(password);

        if (!isEmailValid || !isPasswordValid) {
            return;
        }

        setErrorMessage('');
        setIsSubmitting(true);

        try {
            const data = await mutation.mutateAsync({ 
                email, 
                password,
                rememberMe 
            });
            
            // Handle remember me
            handleRememberMe();
            
            // Update auth state
            // await Promise.all([
            //     setAccessToken(data.tokens.accessToken),
            //     setIsLoggedIn(true),
            //     setUser(data.user)
            // ]);
            login(data.tokens.accessToken)
            setUser(data.user)
            // console.log("lgin success")
            // Navigate after all state updates are complete
            router.replace('/');
        } catch (error) {
            setIsSubmitting(false);
            if (error instanceof Error) {
                console.log("login failed", error.message)
                setErrorMessage(error.message);
            } else {
                setErrorMessage(`Login Failed: ${error}`)
            }
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'email') {
            setEmail(value);
            validateEmail(value);
        } else if (name === 'password') {
            setPassword(value);
            validatePassword(value);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 text-gray-900 pt-22 flex items-center justify-center">
            <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Welcome Back</h1>

                {errorMessage && (
                    <div className="bg-red-50 text-red-800 p-3 rounded-lg mb-4 text-sm" role="alert">
                        {errorMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-gray-600 mb-1">
                            Email Address
                            {validationErrors.email && (
                                <span className="text-red-500 text-sm ml-2" role="alert">
                                    {validationErrors.email}
                                </span>
                            )}
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            className={`w-full p-3 border ${validationErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors`}
                            value={email}
                            onChange={handleInputChange}
                            placeholder="Enter your email"
                            required
                            disabled={isSubmitting}
                            aria-invalid={!!validationErrors.email}
                            aria-describedby={validationErrors.email ? "email-error" : undefined}
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-gray-600 mb-1">
                            Password
                            {validationErrors.password && (
                                <span className="text-red-500 text-sm ml-2" role="alert">
                                    {validationErrors.password}
                                </span>
                            )}
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                name="password"
                                className={`w-full p-3 border ${validationErrors.password ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 transition-colors`}
                                value={password}
                                onChange={handleInputChange}
                                placeholder="Enter your password"
                                required
                                disabled={isSubmitting}
                                aria-invalid={!!validationErrors.password}
                                aria-describedby={validationErrors.password ? "password-error" : undefined}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                disabled={isSubmitting}
                            >
                                {showPassword ? (
                                    <EyeSlashIcon className="h-5 w-5" />
                                ) : (
                                    <EyeIcon className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="rememberMe"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-300 rounded"
                            disabled={isSubmitting}
                        />
                        <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-900">
                            Remember me
                        </label>
                    </div>

                    <button
                        type="submit"
                        className={`w-full py-3 bg-blue-500 text-white font-semibold rounded-lg transition duration-200
                            ${(isSubmitting || mutation.isPending)
                                ? 'opacity-75 cursor-not-allowed' 
                                : 'hover:bg-blue-600 active:bg-blue-700'}`}
                        disabled={isSubmitting || mutation.isPending}
                    >
                        {(isSubmitting || mutation.isPending) ? (
                            <div className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 
                                    5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Signing in...
                            </div>
                        ) : (
                            'Sign In'
                        )}
                    </button>

                    <div className="mt-4 text-center space-y-4">
                        <a 
                            href="/forgot-password" 
                            className="text-sm text-blue-500 hover:text-blue-600 hover:underline focus:outline-none 
                            focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                        >
                            Forgot your password?
                        </a>

                        <p className="text-sm text-gray-500">
                            Don't have an account yet?{' '}
                            <a 
                                href="/signup" 
                                className="text-blue-500 hover:text-blue-600 hover:underline focus:outline-none 
                                focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                            >
                                Create an account
                            </a>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}