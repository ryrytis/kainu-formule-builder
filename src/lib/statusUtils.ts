export const getStatusColor = (status: string | null | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-800';

    switch (status.toLowerCase()) {
        case 'new':
            return 'bg-sky-100 text-sky-800';
        case 'draft':
            return 'bg-gray-100 text-gray-800';
        case 'invoiced':
            return 'bg-orange-100 text-orange-800';
        case 'in progress':
            return 'bg-blue-100 text-blue-800';
        case 'completed':
            return 'bg-green-100 text-green-800';
        case 'cancelled':
            return 'bg-red-100 text-red-800';
        case 'shipped':
            return 'bg-indigo-100 text-indigo-800';
        case 'email inquiry':
            return 'bg-purple-100 text-purple-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};
