import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { NavLink, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const Register: React.FC = () => {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        companyName: '',
        businessType: 'Retail',
        referralCode: ''
    });
    const { register } = useAuth();
    const [loading, setLoading] = useState(false);
    const [searchParams] = useSearchParams();

    // Auto-fill referral code from URL
    React.useEffect(() => {
        const refCode = searchParams.get('ref');
        if (refCode) {
            setFormData(prev => ({ ...prev, referralCode: refCode.toUpperCase() }));
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await register(formData.name, formData.email, formData.password, formData.companyName, formData.businessType, formData.referralCode);
            showToast('Account created successfully!', 'success');
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Registration failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 font-['Inter']">
            <div className="max-w-md w-full animate-in slide-in-from-bottom-8 duration-700">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-600 rounded-[2rem] text-white shadow-2xl mb-6 shadow-primary-200">
                        <Building2 size={40} />
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">BusinessMate ERP</h1>
                </div>

                <div className="card p-10 bg-white/80 backdrop-blur-md rounded-[2.5rem] shadow-2xl shadow-slate-200 border-white">
                    <h2 className="text-2xl font-black mb-8 text-slate-800 tracking-tight uppercase">{t('auth.create_account')}</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Business Type</label>
                            <select 
                                className="input py-4 font-bold bg-slate-50 border-none rounded-2xl w-full"
                                value={formData.businessType}
                                onChange={(e) => setFormData({...formData, businessType: e.target.value})}
                                required
                            >
                                <option value="Retail">Retail / Kirana / Shop</option>
                                <option value="Wholesale">Wholesale / Distribution</option>
                                <option value="Factory">Factory / Manufacturing</option>
                                <option value="Construction">Construction / Materials</option>
                                <option value="Services">Services / Agency</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('common.name')}</label>
                            <input 
                                type="text" 
                                className="input py-4 font-bold bg-slate-50 border-none rounded-2xl" 
                                placeholder={t('placeholders.name')} 
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('auth.org_name')}</label>
                            <input 
                                type="text" 
                                className="input py-4 font-bold bg-slate-50 border-none rounded-2xl" 
                                placeholder={t('placeholders.company_name')} 
                                value={formData.companyName}
                                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('common.email')}</label>
                            <input 
                                type="email" 
                                className="input py-4 font-bold bg-slate-50 border-none rounded-2xl" 
                                placeholder={t('placeholders.email')} 
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('common.password')}</label>
                            <input 
                                type="password" 
                                className="input py-4 font-bold bg-slate-50 border-none rounded-2xl" 
                                placeholder={t('placeholders.password')} 
                                value={formData.password}
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Referral Code (Optional)</label>
                            <input 
                                type="text" 
                                className="input py-4 font-bold bg-slate-50 border-none rounded-2xl" 
                                placeholder="Enter code if you were referred" 
                                value={formData.referralCode}
                                onChange={(e) => setFormData({...formData, referralCode: e.target.value.toUpperCase()})}
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="btn-primary w-full py-5 text-sm font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-primary-100 mt-4 rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {loading ? t('auth.signing_up') : t('common.register')}
                        </button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-slate-50 text-center text-xs">
                        <span className="text-slate-400 font-bold uppercase tracking-widest">{t('auth.has_account')} </span>
                        <NavLink to="/login" className="text-primary-600 font-black uppercase tracking-widest hover:underline ml-1">
                            {t('common.login')}
                        </NavLink>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
