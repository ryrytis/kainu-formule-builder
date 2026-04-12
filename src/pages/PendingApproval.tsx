import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Clock } from 'lucide-react';

const PendingApproval: React.FC = () => {
    const { signOut } = useAuth();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-6">
                <div className="flex justify-center">
                    <div className="bg-orange-100 p-4 rounded-full">
                        <Clock className="w-12 h-12 text-orange-500" />
                    </div>
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900">
                    Account Pending Verify
                </h1>
                
                <p className="text-gray-600 leading-relaxed">
                    Thank you for signing up! Your account is currently under review by our administration team. 
                    Once approved, you will be able to access the Client Portal.
                </p>

                <p className="text-sm text-gray-500">
                    If you have any urgent inquiries, please contact your account manager directly.
                </p>

                <div className="pt-6 border-t border-gray-100">
                    <button 
                        onClick={signOut}
                        className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <LogOut size={18} />
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PendingApproval;
