import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, UserCheck, User, Building } from 'lucide-react';
import ClientSelect from '../components/ClientSelect';

interface Profile {
    id: string;
    role: string;
    client_id: string | null;
    signup_company_name: string | null;
    email: string | null;
    created_at: string;
    clients?: { name: string } | null;
}

const UserManagement: React.FC = () => {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    // For inline editing
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editRole, setEditRole] = useState<string>('');
    const [editClientId, setEditClientId] = useState<string | null>(null);

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        setLoading(true);
        try {
            const { data, error } = await (supabase as any)
                .from('profiles')
                .select(`
                    id, role, client_id, signup_company_name, email, created_at,
                    clients ( name )
                `)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setProfiles(data || []);
        } catch (err) {
            console.error('Error fetching profiles:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (profileId: string) => {
        setEditingId(profileId);
        const p = profiles.find(p => p.id === profileId);
        if (p) {
            setEditRole('client');
            setEditClientId(p.client_id);
        }
    };

    const handleSave = async (profileId: string) => {
        if (!editRole) return;
        if (editRole === 'client' && !editClientId) {
            alert('A client user must be linked to a Company (client_id).');
            return;
        }

        setUpdatingId(profileId);
        try {
            const { error } = await (supabase as any)
                .from('profiles')
                .update({ 
                    role: editRole, 
                    client_id: editRole === 'admin' ? null : editClientId 
                })
                .eq('id', profileId);
            
            if (error) throw error;
            
            setProfiles(prev => prev.map(p => {
                if (p.id === profileId) {
                    // Update locally to avoid full refetch
                    return { ...p, role: editRole, client_id: editRole === 'admin' ? null : editClientId } as Profile;
                }
                return p;
            }));
            
            // Optionally refetch entirely to get the new client name populated
            fetchProfiles();
            
            setEditingId(null);
        } catch (err) {
            console.error('Failed to update profile:', err);
            alert('Failed to save profile changes.');
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-primary">User Management</h1>
                    <p className="text-gray-500 mt-1">Approve signups and manage user roles.</p>
                </div>
            </div>

            <div className="card overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50/50 text-xs uppercase font-medium text-gray-500 border-b border-gray-100">
                            <tr>
                                <th className="py-4 px-6">User</th>
                                <th className="py-4 px-6">Signup Company (Self-reported)</th>
                                <th className="py-4 px-6">Role</th>
                                <th className="py-4 px-6">Linked Client (DB)</th>
                                <th className="py-4 px-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading && (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center"><Loader2 className="animate-spin mx-auto text-accent-teal" /></td>
                                </tr>
                            )}
                            {!loading && profiles.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-gray-500">No users found.</td>
                                </tr>
                            )}
                            {profiles.map(profile => (
                                <tr key={profile.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-gray-100 p-2 rounded-full">
                                                <User size={16} className="text-gray-500" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">{profile.email || 'Unknown Email'}</div>
                                                <div className="text-xs text-gray-400 font-mono mt-0.5">{profile.id.substring(0,8)}...</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        {profile.signup_company_name ? (
                                            <div className="flex items-center gap-2">
                                                <Building size={14} className="text-gray-400" />
                                                <span className="font-medium">{profile.signup_company_name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 italic">None provided</span>
                                        )}
                                    </td>
                                    
                                    {editingId === profile.id ? (
                                        <td className="py-4 px-6" colSpan={2}>
                                            <div className="flex gap-4">
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Role</label>
                                                    <select 
                                                        value={editRole} 
                                                        onChange={(e) => setEditRole(e.target.value)}
                                                        className="input-field py-1.5"
                                                    >
                                                        <option value="pending">Pending</option>
                                                        <option value="client">Client</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                </div>
                                                {editRole === 'client' && (
                                                    <div className="min-w-[200px]">
                                                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Link to Company</label>
                                                        <ClientSelect 
                                                            value={editClientId}
                                                            onChange={setEditClientId}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    ) : (
                                        <>
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider
                                                    ${profile.role === 'admin' ? 'bg-purple-100 text-purple-800' : 
                                                      profile.role === 'client' ? 'bg-blue-100 text-blue-800' : 
                                                      'bg-orange-100 text-orange-800'}`}
                                                >
                                                    {profile.role}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                {profile.role === 'admin' ? (
                                                    <span className="text-gray-400 italic">N/A (Admin)</span>
                                                ) : profile.clients?.name ? (
                                                    <span className="font-medium text-gray-900">{profile.clients.name}</span>
                                                ) : (
                                                    <span className="text-gray-400 italic">Not Linked</span>
                                                )}
                                            </td>
                                        </>
                                    )}

                                    <td className="py-4 px-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {editingId === profile.id ? (
                                                <>
                                                    <button 
                                                        onClick={() => setEditingId(null)}
                                                        className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-200 rounded transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button 
                                                        onClick={() => handleSave(profile.id)}
                                                        disabled={updatingId === profile.id}
                                                        className="px-3 py-1.5 text-xs font-bold text-white bg-accent-teal hover:bg-teal-600 rounded transition-colors flex items-center gap-1"
                                                    >
                                                        {updatingId === profile.id ? <Loader2 size={12} className="animate-spin" /> : 'Save'}
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    {profile.role === 'pending' && (
                                                        <button 
                                                            onClick={() => handleApprove(profile.id)}
                                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-orange-700 bg-orange-100 hover:bg-orange-200 rounded transition-colors"
                                                        >
                                                            <UserCheck size={14} /> Approve
                                                        </button>
                                                    )}
                                                    {profile.role !== 'pending' && (
                                                        <button 
                                                            onClick={() => {
                                                                setEditingId(profile.id);
                                                                setEditRole(profile.role);
                                                                setEditClientId(profile.client_id);
                                                            }}
                                                            className="px-3 py-1.5 text-xs font-bold text-gray-600 border border-gray-200 hover:bg-gray-50 rounded transition-colors"
                                                        >
                                                            Edit
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
