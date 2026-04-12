
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Loader2, User, Bot, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import clsx from 'clsx';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

const ChatWidget: React.FC = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingHistory, setIsFetchingHistory] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch history when opening
    useEffect(() => {
        if (isOpen && user) {
            fetchHistory();
        }
    }, [isOpen, user]);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const fetchHistory = async () => {
        if (!user) return;
        setIsFetchingHistory(true);
        try {
            const { data, error } = await supabase
                .from('chat_messages')
                .select('role, content, created_at')
                .eq('session_id', user.id)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);
        } catch (err) {
            console.error('Failed to fetch chat history:', err);
        } finally {
            setIsFetchingHistory(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !user || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        
        // Optimistic update
        const newMessage: Message = {
            role: 'user',
            content: userMsg,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, newMessage]);
        
        setIsLoading(true);
        try {
            const response = await fetch('/api/app_chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg,
                    sessionId: user.id
                })
            });

            const data = await response.json();
            if (data.response) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: data.response,
                    created_at: new Date().toISOString()
                }]);
            }
        } catch (err) {
            console.error('Failed to send message:', err);
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="absolute bottom-20 right-0 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-primary p-4 flex items-center justify-between text-white shadow-md">
                            <div className="flex items-center gap-3">
                                <div className="bg-accent-teal/20 p-2 rounded-lg">
                                    <Sparkles size={20} className="text-accent-teal" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">AI Assistant</h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                        <span className="text-[10px] text-gray-300 font-medium uppercase tracking-wider">Online</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-gray-300 hover:text-white"
                                title="Close chat"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div 
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50"
                        >
                            {isFetchingHistory ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 size={24} className="animate-spin text-accent-teal" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center py-10">
                                    <div className="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Bot size={24} className="text-gray-400" />
                                    </div>
                                    <p className="text-gray-500 text-sm italic">Hello! How can I help you today?</p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => (
                                    <div 
                                        key={idx}
                                        className={clsx(
                                            "flex gap-3 max-w-[85%]",
                                            msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                                        )}
                                    >
                                        <div className={clsx(
                                            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                            msg.role === 'user' ? "bg-accent-teal/10" : "bg-primary/5 shadow-sm border border-primary/10"
                                        )}>
                                            {msg.role === 'user' ? (
                                                <User size={16} className="text-accent-teal" />
                                            ) : (
                                                <Bot size={16} className="text-primary" />
                                            )}
                                        </div>
                                        <div className={clsx(
                                            "p-3 rounded-2xl text-sm leading-relaxed",
                                            msg.role === 'user' 
                                                ? "bg-accent-teal text-white shadow-lg shadow-accent-teal/20" 
                                                : "bg-white text-gray-700 shadow-sm border border-gray-100"
                                        )}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))
                            )}
                            {isLoading && (
                                <div className="flex gap-3 mr-auto max-w-[85%]">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/5 shadow-sm border border-primary/10">
                                        <Bot size={16} className="text-primary" />
                                    </div>
                                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex gap-2 items-end">
                            <div className="flex-1 relative">
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Type your message..."
                                    className="w-full bg-gray-50 border-none rounded-xl py-2 px-4 text-sm focus:ring-2 focus:ring-accent-teal/20 transition-all resize-none min-h-[40px] max-h-[120px] outline-none"
                                    rows={1}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend(e);
                                        }
                                    }}
                                />
                            </div>
                            <button 
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="bg-primary text-white p-2.5 rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20 flex-shrink-0"
                                title="Send message"
                            >
                                <Send size={20} />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="bg-primary text-white p-4 rounded-2xl shadow-2xl hover:bg-primary/95 transition-all flex items-center justify-center group"
                title={isOpen ? "Close chat" : "Open AI Assistant"}
            >
                {isOpen ? (
                    <X size={24} />
                ) : (
                    <div className="relative">
                        <MessageSquare size={24} />
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent-teal rounded-full border-2 border-primary" />
                    </div>
                )}
            </motion.button>
        </div>
    );
};

export default ChatWidget;
