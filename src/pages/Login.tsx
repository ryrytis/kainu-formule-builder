import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowRight } from 'lucide-react';

const Login: React.FC = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [companyName, setCompanyName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                if (!companyName) {
                    throw new Error('Company name is required for registration.');
                }
                const { error, data } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            company_name: companyName
                        }
                    }
                });
                if (error) throw error;
                // If email confirmation is required, inform user. Otherwise navigate (it will automatically catch them in /pending)
                if (data.user?.identities?.length === 0) {
                     // Sometimes means already registered
                     throw new Error('User already exists. Try logging in.');
                }
                setMessage('Sign up successful! Re-routing...');
                // Usually signUp automatically signs them in if email confirm is off. Our ProtectedRoute catches them.
                setTimeout(() => navigate('/pending'), 1000);
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                navigate('/');
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError('Please enter your email first');
            return;
        }

        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/login`,
            });
            if (error) throw error;
            setMessage('Password reset link sent! Check your email.');
        } catch (err: any) {
            setError(err.message || 'Failed to send reset link');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-white font-sans">
            {/* Left Side - Brand / Visual */}
            <div className="hidden lg:flex w-1/2 bg-primary relative overflow-hidden items-center justify-center p-12">
                {/* Geometric decorative shapes */}
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full border-[1px] border-white/10" />
                <div className="absolute bottom-[-5%] right-[-5%] w-[300px] h-[300px] rounded-full bg-accent-teal/20 blur-3xl" />

                <div className="relative z-10 max-w-lg text-white">
                    <h1 className="text-6xl font-bold mb-6 tracking-tight leading-none">
                        KETURI<span className="text-accent-teal">PRINT</span>
                    </h1>
                    <p className="text-xl text-gray-300 font-light leading-relaxed">
                        Professional CRM for digital printing management.
                        Streamline your orders, clients, and material usage in one unified system.
                    </p>
                    <div className="mt-12 flex gap-4">
                        <div className="h-1 w-12 bg-accent-lime"></div>
                        <div className="h-1 w-12 bg-accent-teal"></div>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
                <div className="w-full max-w-md">
                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-primary mb-2">
                            {isSignUp ? 'Create an Account' : 'Welcome Back'}
                        </h2>
                        {message && (
                            <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm mb-4">
                                {message}
                            </div>
                        )}
                        <p className="text-gray-500 text-sm">
                            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSignUp(!isSignUp);
                                    setError(null);
                                    setMessage(null);
                                }}
                                className="text-accent-teal font-bold hover:underline"
                            >
                                {isSignUp ? 'Log in' : 'Sign up'}
                            </button>
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        {isSignUp && (
                            <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Company Name</label>
                                <input
                                    type="text"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    className="w-full px-0 py-3 bg-transparent border-b-2 border-gray-200 focus:border-accent-teal transition-colors outline-none text-primary placeholder-gray-300 rounded-none text-lg"
                                    placeholder="Your Company OÜ"
                                    required={isSignUp}
                                />
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-0 py-3 bg-transparent border-b-2 border-gray-200 focus:border-accent-teal transition-colors outline-none text-primary placeholder-gray-300 rounded-none text-lg"
                                placeholder="name@company.com"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-0 py-3 bg-transparent border-b-2 border-gray-200 focus:border-accent-teal transition-colors outline-none text-primary placeholder-gray-300 rounded-none text-lg"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <div className="flex justify-end h-6">
                            {!isSignUp && (
                                <button
                                    type="button"
                                    onClick={handleForgotPassword}
                                    className="text-xs font-bold text-accent-teal hover:underline uppercase tracking-wider"
                                >
                                    Forgot Password?
                                </button>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-accent-teal text-white py-4 mt-8 font-bold tracking-widest uppercase hover:bg-[#359aa0] transition-all flex items-center justify-between px-6 group"
                        >
                            <span>{loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Login'}</span>
                            {!loading && <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm text-gray-400">
                        Signups are subject to manual administrative approval.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
