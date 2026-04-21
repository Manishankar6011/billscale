import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Bot, X, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { cn } from '../lib/utils'; 

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const AIAssistant = () => {
    const { user, setUser } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: `Hello ${user?.name}! I'm your BuildMate AI assistant. How can I help you with your business data today?` }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const isBusinessPro = user?.planType === 'business';
    const trialLimit = 5;
    const usageCount = user?.aiUsageCount || 0;
    const isLimitReached = !isBusinessPro && usageCount >= trialLimit;

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isTyping) return;

        if (isLimitReached) {
            showToast('You have reached your AI trial limit. Upgrade to Business Pro for unlimited access!', 'error');
            navigate('/dashboard/pricing');
            return;
        }

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsTyping(true);

        try {
            // 1. Increment usage on our backend
            const { data } = await axios.post('/api/subscription/ai-usage', {}, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            
            // Update user state with new count
            if (user) {
                const updatedUser = { ...user, aiUsageCount: data.aiUsageCount };
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
            }

            // 2. Call your AI API (Placeholder)
            // Replace this with your actual software API endpoint
            const response = await fetchAIResponse(userMsg);
            
            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        } catch (error) {
            showToast('Failed to get AI response. Please try again later.', 'error');
        } finally {
            setIsTyping(false);
        }
    };

    // AI Response Logic (Current: Coming Soon Mode)
    const fetchAIResponse = async (query: string) => {
        await new Promise(r => setTimeout(r, 1500)); // Simulate thinking
        return "Building for you! We are developing this feature and it's coming soon. Thanks for your patience! 🙏";
    };

    return (
        <div className="fixed bottom-24 lg:bottom-10 right-6 z-[100] font-sans">
            {/* Chat Bubble Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-95 group",
                    isOpen ? "bg-slate-900 text-white rotate-90" : "bg-primary-600 text-white hover:bg-primary-700 hover:shadow-primary-200"
                )}
            >
                {isOpen ? <X size={24} /> : (
                    <div className="relative">
                        <MessageSquare size={24} />
                        {!isBusinessPro && (
                            <div className="absolute -top-3 -right-3 bg-rose-500 text-white text-[8px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                                {trialLimit - usageCount > 0 ? trialLimit - usageCount : 0}
                            </div>
                        )}
                    </div>
                )}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="absolute bottom-20 right-0 w-[350px] md:w-[400px] h-[550px] bg-white/90 backdrop-blur-xl border border-white/20 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
                    {/* Header */}
                    <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-500/30">
                                <Bot size={20} />
                            </div>
                            <div>
                                <h4 className="font-black text-sm tracking-tight leading-none mb-1">Business AI</h4>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Always Online</span>
                                </div>
                            </div>
                        </div>
                        {isBusinessPro && (
                            <span className="bg-amber-400 text-slate-900 text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest">
                                Pro Member
                            </span>
                        )}
                    </div>

                    {/* Messages Area */}
                    <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar">
                        {messages.map((msg, i) => (
                            <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                                <div className={cn(
                                    "max-w-[85%] p-4 rounded-2xl text-sm font-medium",
                                    msg.role === 'user' 
                                        ? "bg-primary-600 text-white rounded-br-none" 
                                        : "bg-slate-100 text-slate-800 rounded-bl-none"
                                )}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-slate-100 p-4 rounded-2xl rounded-bl-none flex items-center gap-2">
                                    <Loader2 size={16} className="animate-spin text-slate-400" />
                                    <span className="text-xs font-bold text-slate-400 italic">Thinking...</span>
                                </div>
                            </div>
                        )}
                        {isLimitReached && (
                            <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start gap-3">
                                <AlertCircle className="text-rose-500 shrink-0" size={20} />
                                <div>
                                    <p className="text-xs font-bold text-rose-800">Trial Limit Reached</p>
                                    <p className="text-[10px] text-rose-600 font-semibold mb-2">Upgrade to Business Pro for unlimited AI business analysis.</p>
                                    <button 
                                        onClick={() => {
                                            setIsOpen(false);
                                            navigate('/dashboard/pricing');
                                        }}
                                        className="text-[10px] font-black uppercase text-primary-600 hover:text-primary-700"
                                    >
                                        View Pricing &rarr;
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-6 border-t border-slate-100 bg-white/50 backdrop-blur-md">
                        <form onSubmit={handleSend} className="relative flex items-center gap-2">
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                disabled={isLimitReached || isTyping}
                                placeholder={isLimitReached ? "Limit reached..." : "Ask about your sales..."}
                                className="w-full bg-slate-100 border-none rounded-2xl py-3 pl-4 pr-12 text-sm font-medium focus:ring-2 focus:ring-primary-500/20 placeholder:text-slate-400 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={isLimitReached || !input.trim() || isTyping}
                                className="absolute right-1 w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 disabled:opacity-50 disabled:bg-slate-300 transition-all"
                            >
                                <Send size={18} />
                            </button>
                        </form>
                        <div className="mt-3 flex items-center justify-center gap-1 opacity-40">
                            <Sparkles size={10} className="text-primary-600" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Powered by BuildMate AI</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIAssistant;
