import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useToast();

    return (
        <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none w-full max-w-sm print:hidden">
            <AnimatePresence>
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, x: 50, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        className={cn(
                            "group pointer-events-auto p-4 rounded-2xl shadow-2xl border flex items-center gap-4 relative overflow-hidden backdrop-blur-md transition-all",
                            toast.type === 'success' && "bg-emerald-500/90 border-emerald-400/50 text-white",
                            toast.type === 'error' && "bg-rose-500/90 border-rose-400/50 text-white",
                            toast.type === 'info' && "bg-slate-900/90 border-slate-700/50 text-white"
                        )}
                    >
                        <div className="flex-shrink-0">
                            {toast.type === 'success' && <CheckCircle className="w-6 h-6" />}
                            {toast.type === 'error' && <XCircle className="w-6 h-6" />}
                            {toast.type === 'info' && <Info className="w-6 h-6" />}
                        </div>
                        
                        <div className="flex-1">
                            <p className="text-sm font-black uppercase tracking-widest opacity-60 mb-0.5">
                                {toast.type === 'success' ? 'Success' : toast.type === 'error' ? 'Error' : 'Notification'}
                            </p>
                            <p className="text-xs font-bold leading-relaxed">{toast.message}</p>
                        </div>

                        <button 
                            onClick={() => removeToast(toast.id)}
                            className="p-1 rounded-full hover:bg-white/20 transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <X size={16} />
                        </button>

                        {/* Progress Bar */}
                        <motion.div 
                            initial={{ width: '100%' }}
                            animate={{ width: '0%' }}
                            transition={{ duration: 5, ease: 'linear' }}
                            className="absolute bottom-0 left-0 h-1 bg-white/30"
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
