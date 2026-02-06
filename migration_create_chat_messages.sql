-- Create chat_messages table to enable memory/context
-- Run this in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id text NOT NULL,
    -- Facebook PSID (string)
    role text NOT NULL,
    -- 'user' or 'assistant'
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
-- Index for faster history retrieval
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
-- Explicitly allow public access (or service role) if RLS is on
-- ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow service role" ON public.chat_messages FOR ALL USING (true);