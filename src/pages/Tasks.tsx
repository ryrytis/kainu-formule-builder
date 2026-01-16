import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import TaskList, { Task } from '../components/TaskList';
import CreateTaskModal from '../components/CreateTaskModal';

interface User {
    id: string;
    email: string;
}

interface Order {
    id: string;
    order_number: string;
    status: string;
    clients: {
        name: string;
    };
}

import { useAuth } from '../contexts/AuthContext';

const Tasks: React.FC = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    useEffect(() => {
        fetchTasks();
        fetchUsers();
        fetchOrders();
    }, []);

    const fetchTasks = async () => {
        try {
            const { data, error } = await supabase
                .from('tasks')
                .select(`
                    *,
                    assignee:users!assigned_to(email),
                    creator:users!created_by(email),
                    order:orders(order_number)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Filter out completed tasks older than 60 days
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 60);

            const filteredTasks = (data || []).filter((task: any) => {
                if (task.status === 'completed' && task.due_date) {
                    const taskDueDate = new Date(task.due_date);
                    return taskDueDate >= cutoffDate;
                }
                return true;
            });

            // Sort tasks: non-completed first, then completed
            filteredTasks.sort((a: any, b: any) => {
                const aCompleted = a.status === 'completed';
                const bCompleted = b.status === 'completed';

                if (aCompleted === bCompleted) return 0;
                return aCompleted ? 1 : -1;
            });

            // @ts-ignore
            setTasks(filteredTasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    };

    const fetchUsers = async () => {
        const { data } = await supabase.from('users').select('id, email');
        setUsers(data || []);
    };

    const fetchOrders = async () => {
        const { data } = await supabase
            .from('orders')
            .select(`
                id, 
                order_number, 
                status,
                clients (name)
            `)
            .order('created_at', { ascending: false })
            .limit(50); // Limit to recent 50 orders for now
        // @ts-ignore
        setOrders(data || []);
    };

    const myTasks = tasks.filter(task =>
        (user?.id && task.assigned_to === user.id) ||
        (!task.assigned_to && user?.id && task.created_by === user.id)
    );

    const otherTasks = tasks.filter(task =>
        !(
            (user?.id && task.assigned_to === user.id) ||
            (!task.assigned_to && user?.id && task.created_by === user.id)
        )
    );

    // Group other tasks by assignee
    const groupedOtherTasks = otherTasks.reduce((acc, task) => {
        const assigneeName = task.assignee?.email || 'Unassigned';
        if (!acc[assigneeName]) {
            acc[assigneeName] = [];
        }
        acc[assigneeName].push(task);
        return acc;
    }, {} as Record<string, Task[]>);

    const handleEditTask = (task: Task) => {
        setEditingTask(task);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingTask(null);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
                    <p className="text-gray-500 mt-1">Manage your team's todos and assignments</p>
                </div>
                <button
                    onClick={() => { setEditingTask(null); setShowModal(true); }}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Plus size={20} />
                    New Task
                </button>
            </div>

            {tasks.length > 0 ? (
                <div className="space-y-8">
                    {myTasks.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800 mb-4 ">My Tasks</h2>
                            <TaskList
                                tasks={myTasks}
                                onTaskUpdated={fetchTasks}
                                onEditTask={handleEditTask}
                            />
                        </div>
                    )}

                    {Object.entries(groupedOtherTasks).map(([assigneeName, userTasks]) => (
                        <div key={assigneeName}>
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">
                                {assigneeName === 'Unassigned' ? 'Unassigned' : `Assigned to ${assigneeName}`}
                            </h2>
                            <TaskList
                                tasks={userTasks}
                                onTaskUpdated={fetchTasks}
                                onEditTask={handleEditTask}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <TaskList
                    tasks={[]}
                    onTaskUpdated={fetchTasks}
                />
            )}

            <CreateTaskModal
                isOpen={showModal}
                onClose={handleCloseModal}
                onTaskCreated={fetchTasks}
                users={users}
                orders={orders}
                taskToEdit={editingTask}
            />
        </div>
    );
};

export default Tasks;
