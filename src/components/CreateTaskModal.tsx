import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface User {
    id: string;
    email: string;
}

interface Order {
    id: string;
    order_number: string;
}

interface Task {
    id: string;
    description: string;
    assigned_to: string | null;
    order_id: string | null;
    due_date: string | null;
    estimated_duration: string | null;
    time_spent: string | null;
}

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTaskCreated: () => void;
    users: User[];
    orders: Order[];
    initialOrderId?: string;
    taskToEdit?: Task | null;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
    isOpen,
    onClose,
    onTaskCreated,
    users,
    orders,
    initialOrderId,
    taskToEdit
}) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        description: '',
        assigned_to: '',
        order_id: initialOrderId || '',
        due_date: '',
        estimated_duration: '',
        time_spent: ''
    });

    useEffect(() => {
        if (isOpen) {
            if (taskToEdit) {
                setFormData({
                    description: taskToEdit.description,
                    assigned_to: taskToEdit.assigned_to || '',
                    order_id: taskToEdit.order_id || '',
                    due_date: taskToEdit.due_date ? new Date(taskToEdit.due_date).toISOString().split('T')[0] : '',
                    estimated_duration: taskToEdit.estimated_duration || '',
                    time_spent: taskToEdit.time_spent || ''
                });
            } else {
                setFormData({
                    description: '',
                    assigned_to: '',
                    order_id: initialOrderId || '',
                    due_date: '',
                    estimated_duration: '',
                    time_spent: ''
                });
            }
        }
    }, [isOpen, initialOrderId, taskToEdit]);

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const taskPayload = {
                description: formData.description,
                assigned_to: formData.assigned_to || null,
                order_id: formData.order_id || null,
                due_date: formData.due_date || null,
                estimated_duration: formData.estimated_duration || null,
                time_spent: formData.time_spent || null,
            };

            // @ts-ignore
            if (taskToEdit) {
                const { error } = await (supabase as any)
                    .from('tasks')
                    .update(taskPayload)
                    .eq('id', taskToEdit.id);
                if (error) throw error;
            } else {
                const { error } = await (supabase as any)
                    .from('tasks')
                    .insert({
                        ...taskPayload,
                        created_by: user?.id || null
                    });
                if (error) throw error;
            }

            onTaskCreated();
            onClose();
        } catch (error: any) {
            console.error('Error saving task:', error);
            alert(`Failed to save task: ${error.message || error.error_description || error.toString()}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">{taskToEdit ? 'Edit Task' : 'Create New Task'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
                </div>
                <form onSubmit={handleCreateTask} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            placeholder="What needs to be done?"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Assign To (Optional)
                        </label>
                        <select
                            title="Assign user"
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            value={formData.assigned_to}
                            onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                        >
                            <option value="">No assignee</option>
                            {users.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Due Date (Optional)
                        </label>
                        <input
                            type="date"
                            title="Due date"
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            value={formData.due_date}
                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Est. Duration
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                placeholder="e.g. 2h"
                                value={formData.estimated_duration}
                                onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Time Spent
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                placeholder="e.g. 1h 30m"
                                value={formData.time_spent}
                                onChange={(e) => setFormData({ ...formData, time_spent: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Related Order {initialOrderId && '(Pre-selected)'}
                        </label>
                        <select
                            title="Select order"
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                            value={formData.order_id}
                            onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
                            disabled={!!initialOrderId}
                        >
                            <option value="">No order</option>
                            {orders.map((o) => (
                                <option key={o.id} value={o.id}>
                                    {o.order_number}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary flex items-center gap-2"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                            {taskToEdit ? 'Save Changes' : 'Create Task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTaskModal;
