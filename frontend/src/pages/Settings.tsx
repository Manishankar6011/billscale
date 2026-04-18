import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { User, Building2, Phone, MapPin, Save, ShieldCheck, Crown, ArrowRight, Upload, Image, Mail, Pen, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Settings = () => {
    const { t, i18n } = useTranslation();
    const { user, setUser } = useAuth();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        companyName: '',
        address: '',
        phone: '',
        billingEmail: '',
        billingAddress: '',
        logoUrl: '',
        signature: ''
    });

    const logoInputRef = useRef<HTMLInputElement>(null);
    const sigInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await axios.get('/api/auth/profile');
                const data = res.data;
                setFormData({
                    name: data.name || '',
                    companyName: data.tenantId?.companyName || '',
                    address: data.tenantId?.address || '',
                    phone: data.tenantId?.phone || '',
                    billingEmail: data.tenantId?.billingEmail || '',
                    billingAddress: data.tenantId?.billingAddress || '',
                    logoUrl: data.tenantId?.logoUrl || '',
                    signature: data.tenantId?.signature || '',
                });
            } catch (error) {
                console.error('Error fetching profile', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleFileToBase64 = (file: File, field: 'logoUrl' | 'signature') => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target?.result as string;
            setFormData(prev => ({ ...prev, [field]: base64 }));
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await axios.put('/api/auth/profile', formData);
            setUser(res.data);
            showToast('Settings updated successfully!', 'success');
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to update settings', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">{t('common.loading')}</p>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">{t('settings.title')}</h1>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2 opacity-60">Identity & Organization Management</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Identity Card */}
                <div className="card p-10 bg-white shadow-2xl shadow-slate-200 border-none rounded-[2.5rem] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 text-slate-50 opacity-10 group-hover:scale-110 transition-transform">
                        <User size={120} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                <ShieldCheck size={24} />
                            </div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">{t('settings.personnel')}</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('common.name')}</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input type="text" className="input pl-11 py-4 font-bold bg-slate-50 border-none transition-all focus:ring-primary-500 rounded-2xl" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('common.email')}</label>
                                <input type="email" className="input py-4 font-bold bg-slate-100 border-none text-slate-400 cursor-not-allowed rounded-2xl" value={user?.email} disabled />
                                <p className="text-[9px] text-slate-400 font-bold ml-1 italic">Email cannot be changed for security</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Organization + Logo + Branding Card */}
                <div className="card p-10 bg-white shadow-2xl shadow-slate-200 border-none rounded-[2.5rem] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 text-slate-50 opacity-10 group-hover:scale-110 transition-transform">
                        <Building2 size={120} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                <Building2 size={24} />
                            </div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">{t('settings.organization')}</h2>
                        </div>

                        <div className="space-y-8">
                            {/* Logo Upload */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Logo (shown on invoice)</label>
                                <div className="flex items-center gap-6">
                                    {formData.logoUrl ? (
                                        <div className="relative">
                                            <img src={formData.logoUrl} alt="Company Logo" className="w-20 h-20 object-contain rounded-2xl border-2 border-slate-100 bg-white p-2 shadow-sm" />
                                            <button type="button" onClick={() => setFormData(f => ({ ...f, logoUrl: '' }))} className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-rose-600">
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center">
                                            <Image size={28} className="text-slate-300" />
                                        </div>
                                    )}
                                    <div>
                                        <button type="button" onClick={() => logoInputRef.current?.click()} className="flex items-center gap-2 px-5 py-3 bg-primary-50 text-primary-600 rounded-2xl font-black uppercase tracking-widest text-xs border border-primary-200 hover:bg-primary-100 transition-all">
                                            <Upload size={14} /> Upload Logo
                                        </button>
                                        <p className="text-[10px] text-slate-400 mt-2 ml-1">PNG, JPG — Max 1MB. Shown on printed invoice.</p>
                                        <input ref={logoInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) { if (file.size > 1 * 1024 * 1024) { showToast('Logo must be under 1MB', 'error'); return; } handleFileToBase64(file, 'logoUrl'); }
                                        }} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Registered Name</label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input type="text" className="input pl-11 py-4 font-bold bg-slate-50 border-none rounded-2xl" value={formData.companyName} onChange={(e) => setFormData({...formData, companyName: e.target.value})} required />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Billing Address (On Invoice)</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-4 text-slate-400 w-4 h-4" />
                                        <textarea className="input pl-11 py-4 font-bold bg-slate-50 border-none min-h-[120px] rounded-2xl" value={formData.billingAddress} onChange={(e) => setFormData({...formData, billingAddress: e.target.value})} placeholder="Ground Floor, Sector 15, New Delhi..." />
                                    </div>
                                </div>
                                <div className="space-y-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('common.phone')}</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                            <input type="tel" className="input pl-11 py-4 font-bold bg-slate-50 border-none rounded-2xl" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder={t('placeholders.phone')} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Billing Email (On Invoice)</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                            <input type="email" className="input pl-11 py-4 font-bold bg-slate-50 border-none rounded-2xl" value={formData.billingEmail} onChange={(e) => setFormData({...formData, billingEmail: e.target.value})} placeholder="billing@yourcompany.com" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Office Address (GST / Registration)</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-4 text-slate-400 w-4 h-4" />
                                    <textarea className="input pl-11 py-4 font-bold bg-slate-50 border-none min-h-[100px] rounded-2xl" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder={t('placeholders.address')} />
                                </div>
                            </div>

                            {/* Signature Upload */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Digital Signature (shown on invoice)</label>
                                <div className="flex items-center gap-6">
                                    {formData.signature ? (
                                        <div className="relative">
                                            <img src={formData.signature} alt="Signature" className="h-16 object-contain rounded-2xl border-2 border-slate-100 bg-white px-4 shadow-sm" />
                                            <button type="button" onClick={() => setFormData(f => ({ ...f, signature: '' }))} className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600">
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="h-16 w-40 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center">
                                            <Pen size={20} className="text-slate-300" />
                                        </div>
                                    )}
                                    <div>
                                        <button type="button" onClick={() => sigInputRef.current?.click()} className="flex items-center gap-2 px-5 py-3 bg-emerald-50 text-emerald-600 rounded-2xl font-black uppercase tracking-widest text-xs border border-emerald-200 hover:bg-emerald-100 transition-all">
                                            <Upload size={14} /> Upload Signature
                                        </button>
                                        <p className="text-[10px] text-slate-400 mt-2 ml-1">PNG with transparent background recommended.</p>
                                        <input ref={sigInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) { if (file.size > 500 * 1024) { showToast('Signature must be under 500KB', 'error'); return; } handleFileToBase64(file, 'signature'); }
                                        }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preferences Card */}
                <div className="card p-10 bg-white shadow-2xl shadow-slate-200 border-none rounded-[2.5rem] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 text-primary-50 opacity-10 group-hover:scale-110 transition-transform -z-0">
                        <Save size={120} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                <Save size={24} />
                            </div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">{t('settings.system_pref')}</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('landing.choose_lang')}</label>
                                <select className="input py-4 font-bold bg-slate-50 border-none rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors" value={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)}>
                                    <option value="en">English (International)</option>
                                    <option value="hi">हिन्दी (India)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Subscription Card */}
                <div className="card p-10 bg-slate-900 border-none rounded-[2.5rem] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 text-white opacity-10 group-hover:scale-110 transition-transform">
                        <ShieldCheck size={120} />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white backdrop-blur-md">
                                    <Crown className="text-amber-400" size={24} />
                                </div>
                                <h2 className="text-xl font-black text-white tracking-tight uppercase">{t('settings.subscription')}</h2>
                            </div>
                            <div className="space-y-1">
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">{t('settings.active_plan')}</p>
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl font-black text-white uppercase tracking-tighter">{user?.planType || 'Free'} Plan</span>
                                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">Active</span>
                                </div>
                            </div>
                        </div>
                        <NavLink to="/dashboard/pricing" className="btn-primary-white px-8 py-4 text-[10px] font-black uppercase tracking-widest rounded-xl bg-white text-slate-900 hover:bg-slate-100 flex items-center gap-3">
                            {t('settings.manage_plan')} <ArrowRight size={16} />
                        </NavLink>
                    </div>
                </div>

                <div className="flex justify-end pt-4 pb-12">
                    <button type="submit" disabled={saving} className="btn-primary px-12 py-5 text-sm font-black uppercase tracking-[0.2em] shadow-2xl hover:shadow-primary-300 flex items-center gap-4 rounded-2xl active:scale-[0.98] transition-all">
                        {saving ? (<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>) : (<Save size={20} />)}
                        {t('common.save')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Settings;
