import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Loader2, KeyRound } from 'lucide-react';

interface UpdatePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const UpdatePasswordModal: React.FC<UpdatePasswordModalProps> = ({ isOpen, onClose }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setPassword('');
                setConfirmPassword('');
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary/80 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-accent-teal/10 text-accent-teal rounded-lg">
                            <KeyRound size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-primary">Set New Password</h2>
                    </div>
                    {!success && (
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            aria-label="Close"
                            title="Close"
                        >
                            <X size={24} />
                        </button>
                    )}
                </div>

                <div className="p-6">
                    {success ? (
                        <div className="py-8 text-center space-y-4">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-full">
                                <KeyRound size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-primary">Password Updated!</h3>
                            <p className="text-gray-500">Your new password has been set successfully.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <p className="text-sm text-gray-500">
                                Please enter and confirm your new password below.
                            </p>

                            {error && (
                                <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">New Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-0 py-2 bg-transparent border-b-2 border-gray-200 focus:border-accent-teal transition-colors outline-none text-primary"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-0 py-2 bg-transparent border-b-2 border-gray-200 focus:border-accent-teal transition-colors outline-none text-primary"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-6 py-2 text-sm font-bold uppercase text-gray-500 hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-accent-teal text-white px-8 py-2 text-sm font-bold uppercase tracking-widest hover:bg-[#359aa0] transition-all flex items-center justify-center min-w-[140px]"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : 'Update'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UpdatePasswordModal;
