import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Circle, Clock, User as UserIcon, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface Task {
    id: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    created_by: string;
    assigned_to: string | null;
    order_id: string | null;
    due_date: string | null;

    estimated_duration: string | null;
    created_at: string;
    assignee?: { email: string };
    creator?: { email: string };
    order?: { order_number: string };
}

interface TaskListProps {
    tasks: Task[];
    onTaskUpdated: () => void;
    emptyMessage?: string;
    hideOrderLink?: boolean;
}

const TaskList: React.FC<TaskListProps> = ({
    tasks,
    onTaskUpdated,
    emptyMessage = "No tasks yet",
    hideOrderLink = false
}) => {

    const toggleTaskStatus = async (task: Task) => {
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        try {
            const { error } = await supabase
                .from('tasks')
                // @ts-ignore
                .update({ status: newStatus })
                .eq('id', task.id);

            if (error) throw error;
            onTaskUpdated();
        } catch (error) {
            console.error('Error updating task:', error);
        }
    };

    if (tasks.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                <div className="flex justify-center mb-4">
                    <div className="bg-gray-100 p-4 rounded-full">
                        <CheckCircle size={32} className="text-gray-400" />
                    </div>
                </div>
                <h3 className="text-lg font-medium text-gray-900">{emptyMessage}</h3>
                <p className="mt-1">Create a new task to get started</p>
            </div>
        );
    }

    return (
        <div className="grid gap-4">
            {tasks.map((task) => {
                const isOverdue = task.due_date && task.status !== 'completed' && new Date(task.due_date).toISOString().split('T')[0] < new Date().toISOString().split('T')[0];

                return (
                    <div
                        key={task.id}
                        className={`p-4 rounded-xl border shadow-sm flex items-center gap-4 transition-all ${task.status === 'completed'
                            ? 'opacity-60 bg-gray-50 border-gray-100'
                            : isOverdue
                                ? 'bg-red-50 border-red-200 shadow-sm'
                                : 'bg-white border-gray-100 hover:shadow-md'
                            }`}
                    >
                        <button
                            onClick={() => toggleTaskStatus(task)}
                            className={`flex-shrink-0 transition-colors ${task.status === 'completed' ? 'text-green-500' : 'text-gray-300 hover:text-green-500'
                                }`}
                        >
                            {task.status === 'completed' ? (
                                <CheckCircle size={24} className="fill-current" />
                            ) : (
                                <Circle size={24} />
                            )}
                        </button>

                        <div className="flex-1 min-w-0">
                            <p
                                className={`text-lg font-medium truncate ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'
                                    }`}
                            >
                                {task.description}
                            </p>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                {task.assignee && (
                                    <div className="flex items-center gap-1">
                                        <UserIcon size={14} />
                                        <span>{task.assignee.email}</span>
                                    </div>
                                )}
                                {!hideOrderLink && task.order && (
                                    <Link
                                        to={`/orders/${task.order_id}`}
                                        className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
                                    >
                                        <Package size={14} />
                                        <span>{task.order.order_number}</span>
                                    </Link>
                                )}
                                {task.due_date && (
                                    <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-400'
                                        }`}>
                                        <Clock size={14} />
                                        <span>Due {new Date(task.due_date).toISOString().split('T')[0]}</span>
                                    </div>
                                )}
                                {task.estimated_duration && (
                                    <div className="flex items-center gap-1 text-gray-400" title="Estimated Duration">
                                        <Clock size={14} />
                                        <span>{task.estimated_duration}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1 text-gray-400">
                                    <Clock size={14} />
                                    <span>{new Date(task.created_at).toISOString().split('T')[0]}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-shrink-0">
                            <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${task.status === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : task.status === 'in_progress'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}
                            >
                                {task.status === 'pending' ? 'To Do' : task.status.replace('_', ' ')}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default TaskList;
