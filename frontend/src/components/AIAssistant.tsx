import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Bot, X, Sparkles, AlertCircle, Loader2, Mic, StopCircle, Radio } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { cn } from '../lib/utils'; 

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

type LivePhase = 'idle' | 'listening' | 'processing' | 'speaking';

const AIAssistant = () => {
    const { user, setUser } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: `Hello ${user?.name}! I'm your BuildMate AI assistant. Type, click the mic, or go LIVE to speak with me!` }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Voice State
    const [voiceSupported, setVoiceSupported] = useState(false);
    const [ttsSupported, setTtsSupported] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [autoSpeak, setAutoSpeak] = useState(false);

    // Live Voice State
    const [livePhase, setLivePhase] = useState<LivePhase>('idle');
    const isLiveModeRef = useRef(false);
    const liveTranscriptRef = useRef("");
    const recognitionRef = useRef<any>(null);

    const messagesRef = useRef<Message[]>([]);

    useEffect(() => {
      messagesRef.current = messages;
    }, [messages]);

    const isBusinessPro = user?.planType === 'business';
    const trialLimit = 5;
    const usageCount = user?.aiUsageCount || 0;
    const isLimitReached = !isBusinessPro && usageCount >= trialLimit;

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setVoiceSupported('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
            setTtsSupported('speechSynthesis' in window);
        }
    }, []);

    const speakText = useCallback((text: string, onDone?: () => void) => {
        if (!ttsSupported || !text.trim()) {
            onDone?.();
            return;
        }
        window.speechSynthesis.cancel();
        setIsSpeaking(false);

        // Pre-process numbers: remove commas within numbers to count digits correctly
        let processedText = text.replace(/(\d),(\d)/g, '$1$2');
        // If a number has 6 or more digits (i.e. more than 5), space them out so TTS reads digits individually
        processedText = processedText.replace(/\b\d{6,}\b/g, match => match.split('').join(' '));

        let cleanText = processedText.replace(/[*_~`#]/g, "").replace(/[-:,]/g, " ").trim();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = "hi-IN";
        utterance.rate = 0.95;
        
        const voices = window.speechSynthesis.getVoices();
        const hindiVoice = voices.find(v => v.lang.includes("hi-IN") || v.lang.includes("en-IN"));
        if (hindiVoice) utterance.voice = hindiVoice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
            setIsSpeaking(false);
            onDone?.();
        };
        utterance.onerror = () => {
            setIsSpeaking(false);
            onDone?.();
        };

        window.speechSynthesis.speak(utterance);
    }, [ttsSupported]);

    const stopSpeaking = useCallback(() => {
        window.speechSynthesis?.cancel();
        setIsSpeaking(false);
    }, []);

    const fetchAIResponse = async (query: string, currentMessages: Message[]) => {
        if (isLimitReached) {
            showToast('You have reached your AI trial limit. Upgrade to Business Pro for unlimited access!', 'error');
            navigate('/dashboard/pricing');
            return null;
        }

        const userMsg: Message = { role: 'user', content: query };
        const nextMessages = [...currentMessages, userMsg];
        setMessages(nextMessages);
        setIsTyping(true);

        try {
            if (!isBusinessPro) {
                const { data: usageData } = await axios.post('/api/subscription/ai-usage', {}, {
                    headers: { Authorization: `Bearer ${user?.token}` }
                });
                if (user) {
                    setUser({ ...user, aiUsageCount: usageData.aiUsageCount });
                }
            }

            const { data } = await axios.post('/api/ai/chat', {
                prompt: query,
                messages: nextMessages
            }, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });

            const reply = data.response || "I couldn't generate a response. Please try again.";
            setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
            return reply;
        } catch (error) {
            console.error('AI Error:', error);
            showToast('Failed to get AI response.', 'error');
            return null;
        } finally {
            setIsTyping(false);
        }
    };

    const handleSend = async (e?: React.FormEvent, overrideText?: string) => {
        e?.preventDefault();
        const textToSend = overrideText || input;
        if (!textToSend.trim() || isTyping) return;

        setInput('');
        const reply = await fetchAIResponse(textToSend, messagesRef.current);
        if (reply && autoSpeak && !isLiveModeRef.current) {
            speakText(reply);
        }
    };

    const startLiveListeningCycle = useCallback(() => {
        if (!isLiveModeRef.current) return;
        const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionClass) return;

        const recognition = new SpeechRecognitionClass();
        recognition.lang = "hi-IN";
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        liveTranscriptRef.current = "";

        recognition.onstart = () => {
            if (!isLiveModeRef.current) { recognition.abort(); return; }
            setIsListening(true);
            setLivePhase("listening");
        };

        recognition.onresult = (event: any) => {
            const transcript = event.results[0]?.[0]?.transcript ?? "";
            liveTranscriptRef.current = transcript.trim();
        };

        recognition.onerror = (event: any) => {
            if (!isLiveModeRef.current) return;
            if (event.error === "aborted") return;
            setTimeout(() => {
                if (isLiveModeRef.current) startLiveListeningCycle();
            }, 800);
        };

        recognition.onend = async () => {
            setIsListening(false);
            if (!isLiveModeRef.current) return;

            const transcript = liveTranscriptRef.current;
            liveTranscriptRef.current = "";

            if (!transcript) {
                setTimeout(() => {
                    if (isLiveModeRef.current) startLiveListeningCycle();
                }, 300);
                return;
            }

            setInput(transcript);
            setLivePhase("processing");

            const replyContent = await fetchAIResponse(transcript, messagesRef.current);
            setInput("");

            if (!isLiveModeRef.current) return;

            if (replyContent) {
                setLivePhase("speaking");
                speakText(replyContent, () => {
                    if (isLiveModeRef.current) {
                        setTimeout(() => startLiveListeningCycle(), 400);
                    }
                });
            } else {
                setTimeout(() => {
                    if (isLiveModeRef.current) startLiveListeningCycle();
                }, 800);
            }
        };

        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch (e) {}
    }, [fetchAIResponse, speakText]);

    const enterLiveMode = useCallback(() => {
        if (!voiceSupported || !ttsSupported) {
            showToast("Voice not supported in this browser.", "error");
            return;
        }
        isLiveModeRef.current = true;
        setAutoSpeak(true);
        setLivePhase("listening");
        startLiveListeningCycle();
    }, [voiceSupported, ttsSupported, startLiveListeningCycle, showToast]);

    const exitLiveMode = useCallback(() => {
        isLiveModeRef.current = false;
        setLivePhase("idle");
        recognitionRef.current?.abort();
        recognitionRef.current = null;
        window.speechSynthesis?.cancel();
        setIsListening(false);
        setIsSpeaking(false);
        setInput("");
    }, []);

    const toggleListening = () => {
        if (!voiceSupported) return;
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognitionClass();
            recognition.lang = "hi-IN";
            recognition.continuous = false;
            recognition.onstart = () => setIsListening(true);
            recognition.onresult = (event: any) => {
                const transcript = event.results[0]?.[0]?.transcript ?? "";
                if (transcript.trim()) {
                    setInput(transcript.trim());
                    handleSend(undefined, transcript.trim());
                }
            };
            recognition.onerror = () => setIsListening(false);
            recognition.onend = () => setIsListening(false);
            recognitionRef.current = recognition;
            recognition.start();
        }
    };

    useEffect(() => {
        return () => {
            isLiveModeRef.current = false;
            recognitionRef.current?.abort();
            window.speechSynthesis?.cancel();
        };
    }, []);

    const isLiveMode = livePhase !== 'idle';

    const LiveModeOverlay = () => {
        const orbColors: Record<LivePhase, string> = {
          idle: "transparent",
          listening: "rgba(239,68,68,0.15)",
          processing: "rgba(245,158,11,0.15)",
          speaking: "rgba(99,102,241,0.15)",
        };
        const orbBorder: Record<LivePhase, string> = {
          idle: "transparent",
          listening: "#ef4444",
          processing: "#f59e0b",
          speaking: "#6366f1",
        };
        const labels: Record<LivePhase, string> = {
          idle: "",
          listening: "Listening... Speak now",
          processing: "Thinking...",
          speaking: "Speaking...",
        };
        return (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
                <div 
                    className="w-28 h-28 rounded-full border-4 flex items-center justify-center transition-all duration-300 shadow-2xl mb-6"
                    style={{ background: orbColors[livePhase], borderColor: orbBorder[livePhase], boxShadow: `0 0 40px ${orbColors[livePhase]}` }}
                >
                    {livePhase === 'listening' ? <Mic size={40} className="text-red-500 animate-pulse" /> : 
                     livePhase === 'speaking' ? <Volume2Icon /> : 
                     <Loader2 size={40} className="text-amber-500 animate-spin" />}
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: orbBorder[livePhase] }}>{labels[livePhase]}</h3>
                {input && <p className="text-sm text-slate-500 bg-slate-100 px-4 py-2 rounded-xl mb-4 max-w-full truncate text-center">"{input}"</p>}
                
                <button 
                    onClick={exitLiveMode}
                    className="mt-4 px-6 py-3 bg-red-50 text-red-600 rounded-full font-bold text-sm hover:bg-red-100 transition-all"
                >
                    ✕ Exit Live Mode
                </button>
            </div>
        );
    };

    const Volume2Icon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500 animate-pulse"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
    );

    return (
        <div className="fixed bottom-32 lg:bottom-10 right-6 z-[100] font-sans">
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

            {isOpen && (
                <div className="absolute bottom-20 right-0 w-[350px] md:w-[400px] h-[550px] bg-white/90 backdrop-blur-xl border border-white/20 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
                    {isLiveMode && <LiveModeOverlay />}
                    
                    <div className="bg-slate-900 p-6 text-white flex items-center justify-between z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-500/30">
                                <Bot size={20} />
                            </div>
                            <div>
                                <h4 className="font-black text-sm tracking-tight leading-none mb-1">Business AI</h4>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        {isSpeaking ? "Speaking..." : isListening ? "Listening..." : "Online"}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {voiceSupported && ttsSupported && (
                                <button 
                                    onClick={enterLiveMode}
                                    className="bg-red-500/20 text-red-400 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest flex items-center gap-1 hover:bg-red-500/30 transition-all"
                                    title="Start hands-free voice chat"
                                >
                                    <Radio size={12} className="animate-pulse" /> LIVE
                                </button>
                            )}
                            {isBusinessPro && (
                                <span className="bg-amber-400 text-slate-900 text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest">
                                    Pro
                                </span>
                            )}
                        </div>
                    </div>

                    <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar bg-slate-50">
                        {messages.map((msg, i) => (
                            <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                                <div className={cn(
                                    "max-w-[85%] p-4 rounded-2xl text-sm font-medium shadow-sm",
                                    msg.role === 'user' 
                                        ? "bg-primary-600 text-white rounded-br-none" 
                                        : "bg-white text-slate-800 rounded-bl-none border border-slate-100"
                                )}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white p-4 rounded-2xl rounded-bl-none border border-slate-100 shadow-sm flex items-center gap-2">
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

                    <div className="p-4 border-t border-slate-100 bg-white">
                        <form onSubmit={handleSend} className="relative flex items-center gap-2">
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                disabled={isLimitReached || isTyping}
                                placeholder={isLimitReached ? "Limit reached..." : "Ask about your business..."}
                                className="w-full bg-slate-100 border-none rounded-2xl py-3 pl-4 pr-[80px] text-sm font-medium focus:ring-2 focus:ring-primary-500/20 placeholder:text-slate-400 transition-all"
                            />
                            <div className="absolute right-1 flex items-center gap-1">
                                {voiceSupported && (
                                    <button
                                        type="button"
                                        onClick={toggleListening}
                                        disabled={isLimitReached || isTyping}
                                        className={cn(
                                            "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                                            isListening ? "bg-red-100 text-red-500 animate-pulse" : "bg-transparent text-slate-400 hover:text-primary-600 hover:bg-slate-200"
                                        )}
                                    >
                                        {isListening ? <StopCircle size={16} /> : <Mic size={16} />}
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={isLimitReached || !input.trim() || isTyping}
                                    className="w-8 h-8 rounded-xl bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 disabled:opacity-50 disabled:bg-slate-300 transition-all"
                                >
                                    <Send size={14} />
                                </button>
                            </div>
                        </form>
                        <div className="mt-3 flex items-center justify-center gap-1 opacity-40">
                            <Sparkles size={10} className="text-primary-600" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Powered by BuildMate AI & Groq</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIAssistant;
