import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Lock, ArrowRight, X } from 'lucide-react';

interface UpgradePromptProps {
    feature: string;
    description: string;
    onClose?: () => void;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({ feature, description, onClose }) => {
    const navigate = useNavigate();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] p-8 md:p-12 max-w-md w-full shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 text-primary-50 opacity-50 group-hover:scale-110 transition-transform -z-0">
                    <Crown size={120} />
                </div>
                
                {onClose && (
                    <button 
                        onClick={onClose}
                        className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors z-10"
                    >
                        <X size={24} />
                    </button>
                )}

                <div className="relative z-10">
                    <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-600 mb-8 shadow-sm">
                        <Lock size={32} />
                    </div>

                    <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-4 uppercase">
                        Upgrade to Unlock
                    </h2>
                    
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-8">
                        <h3 className="font-black text-primary-600 text-sm uppercase tracking-widest mb-1">{feature}</h3>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed">
                            {description}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <button 
                            onClick={() => navigate('/pricing')}
                            className="w-full py-5 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center justify-center gap-3"
                        >
                            View Pricing Plans <ArrowRight size={20} />
                        </button>
                        <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Plans start from just ₹139/month
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpgradePrompt;
