import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminRoute: React.FC = () => {
    const { profile, loading } = useAuth();

    if (loading) return null;

    if (profile?.role !== 'admin') {
        // Redirect clients away from admin pages to their dashboard/calculator
        return <Navigate to="/calculator" replace />;
    }

    return <Outlet />;
};

export default AdminRoute;
