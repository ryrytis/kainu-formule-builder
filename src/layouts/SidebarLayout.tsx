import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingCart, Box, Settings, LogOut, Ruler, BarChart3, Calculator, ListTodo } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import UpdatePasswordModal from '../components/UpdatePasswordModal';
import { supabase } from '../lib/supabase';

const SidebarLayout: React.FC = () => {
    const { user, showPasswordReset, setShowPasswordReset } = useAuth();
    const [pendingTaskCount, setPendingTaskCount] = React.useState(0);

    const fetchTaskCount = async () => {
        if (!user) return;

        try {
            const { count, error } = await supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .neq('status', 'completed')
                .or(`assigned_to.eq.${user.id},and(assigned_to.is.null,created_by.eq.${user.id})`);

            if (error) {
                console.error('Error fetching task count:', error);
                return;
            }

            setPendingTaskCount(count || 0);
        } catch (err) {
            console.error('Error fetching task count:', err);
        }
    };

    React.useEffect(() => {
        fetchTaskCount();

        if (!user) return;

        const subscription = supabase
            .channel('tasks_sidebar_count')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tasks',
                    filter: `assigned_to=eq.${user.id}`
                },
                () => {
                    fetchTaskCount();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tasks',
                    filter: `created_by=eq.${user.id}`
                },
                () => {
                    fetchTaskCount();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user]);

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', to: '/' },
        { icon: ListTodo, label: 'Tasks', to: '/tasks' },
        { icon: ShoppingCart, label: 'Orders', to: '/orders' },
        { icon: Users, label: 'Clients', to: '/clients' },
        { icon: ShoppingCart, label: 'Products', to: '/products' },
        { icon: Box, label: 'Materials', to: '/materials' },
        { icon: Ruler, label: 'Calc Rules', to: '/rules' },
        { icon: Calculator, label: 'Calculator', to: '/calculator' },
        { icon: BarChart3, label: 'Reporting', to: '/reporting' },
        { icon: Settings, label: 'Settings', to: '/settings' },
    ].filter(item => item.label !== 'Settings' || user?.email?.includes('rytis'));

    return (
        <div className="flex h-screen bg-background">
            {/* Sidebar */}
            <aside className="w-64 bg-primary text-white flex flex-col shadow-lg">
                <div className="p-6 border-b border-primary-light">
                    <h1 className="text-2xl font-bold text-white tracking-wider">
                        KETURI<span className="text-accent-teal">PRINT</span>
                    </h1>
                    <p className="text-xs text-gray-400 mt-1">CRM System</p>
                </div>

                <nav className="flex-1 overflow-y-auto py-8">
                    <ul className="space-y-1">
                        {navItems.map((item) => (
                            <li key={item.label}>
                                <NavLink
                                    to={item.to}
                                    className={({ isActive }) =>
                                        clsx(
                                            'flex items-center gap-4 px-8 py-3 transition-all duration-200 border-l-4 relative',
                                            isActive
                                                ? 'bg-primary-light border-accent-teal text-white'
                                                : 'border-transparent text-gray-400 hover:text-white hover:bg-primary-light/50'
                                        )
                                    }
                                >
                                    <item.icon size={20} />
                                    <span className="font-bold tracking-wide text-sm uppercase">{item.label}</span>
                                    {item.label === 'Tasks' && pendingTaskCount > 0 && (
                                        <span className="absolute right-4 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                                            {pendingTaskCount}
                                        </span>
                                    )}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="p-4 border-t border-primary-light">
                    <button
                        onClick={() => supabase.auth.signOut()}
                        className="flex items-center gap-3 w-full px-4 py-3 text-gray-300 hover:bg-primary-light hover:text-red-400 rounded-lg transition-colors"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto p-8 relative">
                <Outlet />
            </main>

            <UpdatePasswordModal
                isOpen={showPasswordReset}
                onClose={() => setShowPasswordReset(false)}
            />
        </div>
    );
};

export default SidebarLayout;
