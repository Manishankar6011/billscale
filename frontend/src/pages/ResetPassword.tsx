import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const ResetPassword = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { showToast } = useToast();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            showToast("Passwords do not match", "error");
            return;
        }
        setLoading(true);
        try {
            await axios.put(`/api/auth/reset-password/${token}`, { password });
            showToast(t('auth.reset_success'), 'success');
            navigate('/login');
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Reset failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 font-['Inter']">
            <div className="max-w-md w-full animate-in zoom-in-95 duration-500">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-600 rounded-[2rem] text-white shadow-2xl mb-6 shadow-primary-200">
                        <Lock size={40} />
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase tracking-[-0.05em]">BusinessMate ERP</h1>
                </div>

                <div className="card p-10 bg-white/80 backdrop-blur-md rounded-[2.5rem] shadow-2xl shadow-slate-200 border-white">
                    <h2 className="text-2xl font-black mb-8 text-slate-800 tracking-tight uppercase">{t('auth.reset_password')}</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('common.password')}</label>
                            <input 
                                type="password" 
                                className="input py-4 font-bold bg-slate-50 border-none rounded-2xl" 
                                placeholder="New Password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
                            <input 
                                type="password" 
                                className="input py-4 font-bold bg-slate-50 border-none rounded-2xl" 
                                placeholder="Confirm New Password" 
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="btn-primary w-full py-5 text-sm font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-primary-100 mt-4 rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {loading ? 'Updating...' : t('auth.reset_password')}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export { ResetPassword };
export default ResetPassword;
