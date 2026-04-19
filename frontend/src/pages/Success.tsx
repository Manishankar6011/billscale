import React, { useEffect } from 'react';
import { CheckCircle2, ArrowRight, PartyPopper } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Success = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => {
            navigate('/dashboard');
        }, 5000);
        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center">
                <div className="relative inline-block mb-8">
                    <div className="w-32 h-32 bg-emerald-50 rounded-[3rem] flex items-center justify-center text-emerald-500 animate-in zoom-in duration-500">
                        <CheckCircle2 size={64} />
                    </div>
                    <div className="absolute -top-4 -right-4 w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-500 animate-bounce delay-300">
                        <PartyPopper size={24} />
                    </div>
                </div>

                <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-4">Payment Success!</h1>
                <p className="text-slate-500 font-medium mb-10">
                    Your subscription has been activated. You now have access to premium features. Redirecting to dashboard in 5 seconds...
                </p>

                <div className="space-y-4">
                    <Link 
                        to="/dashboard"
                        className="w-full py-5 bg-primary-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-primary-100 hover:bg-primary-700 transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                        Go to Dashboard <ArrowRight size={18} />
                    </Link>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">A confirmation email has been sent to you.</p>
                </div>
            </div>
        </div>
    );
};

export default Success;
