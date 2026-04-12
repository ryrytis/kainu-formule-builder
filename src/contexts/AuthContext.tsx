import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Profile {
    role: string;
    client_id: string | null;
    signup_company_name?: string | null;
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    loading: boolean;
    showPasswordReset: boolean;
    setShowPasswordReset: (show: boolean) => void;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    showPasswordReset: false,
    setShowPasswordReset: () => { },
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [showPasswordReset, setShowPasswordReset] = useState(false);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role, client_id, signup_company_name')
                .eq('id', userId)
                .single();
            
            if (error) {
                console.error('Error fetching profile:', error);
                
                // Fallback for missing profile
                // Defaulting logic: If no profile exists yet (migration not run fully), default to 'admin' like before.
                // Or maybe they are the main users. For safety, default to admin if query fails so users aren't locked out immediately.
                setProfile({ role: 'admin', client_id: null });
            } else if (data) {
                setProfile(data);
            }
        } catch (err) {
            console.error('Profile fetch exception:', err);
        }
    };

    useEffect(() => {
        // Check active sessions and sets the user
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                await fetchProfile(session.user.id);
            } else {
                setProfile(null);
            }
        }).catch((err) => {
            console.error('Auth Init Error:', err);
        }).finally(() => {
            setLoading(false);
        });

        // Listen for changes on auth state (logged in, signed out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            
            if (session?.user) {
                await fetchProfile(session.user.id);
            } else {
                setProfile(null);
            }
            
            setLoading(false);

            if (event === 'PASSWORD_RECOVERY') {
                setShowPasswordReset(true);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Auto-Logout Logic
    useEffect(() => {
        if (!user) return;

        const INACTIVITY_LIMIT = 2 * 60 * 60 * 1000; // 2 hours
        let activityTimer: NodeJS.Timeout;

        const resetTimer = () => {
            if (activityTimer) clearTimeout(activityTimer);
            activityTimer = setTimeout(() => {
                console.log('User inactive for 2 hours. Signing out.');
                signOut();
            }, INACTIVITY_LIMIT);
        };

        // Events to listen for
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

        // Attach listeners
        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        // Initialize timer
        resetTimer();

        // Cleanup
        return () => {
            if (activityTimer) clearTimeout(activityTimer);
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [user]);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#F5F5F7]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D2E3B]"></div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user, session, profile, loading, showPasswordReset, setShowPasswordReset, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
