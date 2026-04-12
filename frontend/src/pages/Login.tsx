import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Construction } from 'lucide-react';
import { useToast } from '../context/ToastContext';

import axios from 'axios';

const Login: React.FC = () => {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [forgotMode, setForgotMode] = useState(false);
    const [resetToken, setResetToken] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(email, password);
            showToast(t('auth.login_success'), 'success');
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Login failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await axios.post('/api/auth/forgot-password', { email });
            setResetToken(data.resetToken);
            showToast(t('auth.reset_email_sent'), 'success');
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Error occurred', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 font-['Inter']">
            <div className="max-w-md w-full animate-in zoom-in-95 duration-500">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-600 rounded-[2rem] text-white shadow-2xl mb-6 shadow-primary-200">
                        <Construction size={40} />
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">BuildMate ERP</h1>
                    <p className="text-slate-500 font-bold text-sm tracking-tight mt-1 uppercase opacity-60">Operations Management System</p>
                </div>

                <div className="card p-10 bg-white/80 backdrop-blur-md rounded-[2.5rem] shadow-2xl shadow-slate-200 border-white">
                    <h2 className="text-2xl font-black mb-8 text-slate-800 tracking-tight uppercase">
                        {forgotMode ? t('auth.reset_password') : t('auth.welcome_back')}
                    </h2>
                    
                    <form onSubmit={forgotMode ? handleForgotPassword : handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('common.email')}</label>
                            <input 
                                type="email" 
                                className="input py-4 font-bold bg-slate-50 border-none rounded-2xl" 
                                placeholder={t('placeholders.email')} 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        
                        {!forgotMode && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('common.password')}</label>
                                    <button 
                                        type="button" 
                                        onClick={() => setForgotMode(true)}
                                        className="text-[10px] font-black text-primary-600 uppercase tracking-widest hover:underline"
                                    >
                                        {t('auth.forgot_password')}
                                    </button>
                                </div>
                                <input 
                                    type="password" 
                                    className="input py-4 font-bold bg-slate-50 border-none rounded-2xl" 
                                    placeholder={t('placeholders.password')} 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        {resetToken && (
                            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                <p className="text-[11px] font-black text-emerald-600 uppercase mb-2">Simulated Reset Token (Normally sent via Email)</p>
                                <code className="block text-xs font-mono break-all font-bold text-emerald-800">{resetToken}</code>
                                <NavLink to={`/reset-password/${resetToken}`} className="mt-4 block text-center btn-primary py-2 text-[10px]">
                                    Go to Reset Page
                                </NavLink>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="btn-primary w-full py-5 text-sm font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-primary-100 mt-4 rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {loading ? t('auth.signing_in') : (forgotMode ? t('auth.send_reset_link') : t('common.login'))}
                        </button>

                        {forgotMode && (
                            <button 
                                type="button"
                                onClick={() => { setForgotMode(false); setResetToken(null); }}
                                className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 mt-2"
                            >
                                {t('auth.back_to_login')}
                            </button>
                        )}
                    </form>

                    <div className="mt-10 pt-8 border-t border-slate-50 text-center text-xs">
                        <span className="text-slate-400 font-bold uppercase tracking-widest">{t('auth.no_account')} </span>
                        <NavLink to="/register" className="text-primary-600 font-black uppercase tracking-widest hover:underline ml-1">
                            {t('common.register')}
                        </NavLink>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
