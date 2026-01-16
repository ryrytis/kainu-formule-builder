import { supabase } from './supabase';

export interface FileObject {
    name: string;
    id: string; // We might use path as ID
    updated_at: string;
    created_at: string;
    last_accessed_at: string;
    metadata: Record<string, any>;
    size: number; // bytes
    mimetype: string;
    url?: string; // Signed URL
}

const BUCKET_NAME = 'order-files';

export const StorageService = {

    /**
     * Lists all files for a specific order
     */
    listFiles: async (orderId: string): Promise<FileObject[]> => {
        const { data, error } = await supabase
            .storage
            .from(BUCKET_NAME)
            .list(orderId, {
                limit: 100,
                offset: 0,
                sortBy: { column: 'name', order: 'asc' },
            });

        if (error) {
            console.error('Error listing files:', error);
            // bucket might not exist yet
            return [];
        }

        // Filter out empty placeholders if any (Supabase sometimes returns .emptyFolderPlaceholder)
        return data.filter(f => f.name !== '.emptyFolderPlaceholder') as unknown as FileObject[];
    },

    /**
     * Uploads a file to the order's folder
     */
    uploadFile: async (orderId: string, file: File) => {
        const filePath = `${orderId}/${file.name}`;

        const { data, error } = await supabase
            .storage
            .from(BUCKET_NAME)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) throw error;
        return data;
    },

    /**
     * Deletes a file
     */
    deleteFile: async (orderId: string, fileName: string) => {
        const { error } = await supabase
            .storage
            .from(BUCKET_NAME)
            .remove([`${orderId}/${fileName}`]);

        if (error) throw error;
    },

    /**
     * Gets a download URL (public or signed)
     */
    getDownloadUrl: (orderId: string, fileName: string) => {
        const { data } = supabase
            .storage
            .from(BUCKET_NAME)
            .getPublicUrl(`${orderId}/${fileName}`);

        return data.publicUrl;
    }
};
