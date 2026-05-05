import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { NavLink, useNavigate } from 'react-router-dom';
import { User, Building2, Phone, MapPin, Save, ShieldCheck, Crown, ArrowRight, Upload, Image, Mail, Pen, X, AlertCircle, Loader2, MessageSquare, Bug, Lightbulb, Trash2, AlertTriangle, Users, Plus, Link, ExternalLink, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { canUseFeature } from '../utils/planLimits';
import { Lock } from 'lucide-react';

const Settings = () => {
    const { t, i18n } = useTranslation();
    const { user, setUser, logout } = useAuth();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const { data: profile, isLoading: loading } = useQuery({
        queryKey: ['profile'],
        queryFn: async () => {
            const res = await axios.get('/api/auth/profile');
            return res.data;
        },
        enabled: !!user
    });

    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState<'logo' | 'signature' | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        companyName: '',
        address: '',
        phone: '',
        billingEmail: '',
        billingAddress: '',
        logoUrl: '',
        signature: '',
        upiId: '',
        slug: '',
        gstin: '',
        pan: '',
        stateName: '',
        stateCode: '',
        invoiceFormat: 'modern' as 'modern' | 'gst'
    });

    const logoInputRef = useRef<HTMLInputElement>(null);
    const sigInputRef = useRef<HTMLInputElement>(null);
    
    // Staff Management State
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [staffFormData, setStaffFormData] = useState({ name: '', email: '', password: '' });
    const [creatingStaff, setCreatingStaff] = useState(false);

    const { data: staffUsers = [], refetch: refetchStaff } = useQuery({
        queryKey: ['staff-users'],
        queryFn: async () => {
            const res = await axios.get('/api/auth/staff');
            return res.data;
        },
        enabled: user?.role === 'owner'
    });

    useEffect(() => {
        if (profile) {
            setFormData({
                name: profile.name || '',
                companyName: profile.tenantId?.companyName || '',
                address: profile.tenantId?.address || '',
                phone: profile.tenantId?.phone || '',
                billingEmail: profile.tenantId?.billingEmail || '',
                billingAddress: profile.tenantId?.billingAddress || '',
                logoUrl: profile.tenantId?.logoUrl || '',
                signature: profile.tenantId?.signature || '',
                upiId: profile.tenantId?.upiId || '',
                slug: profile.tenantId?.slug || '',
                gstin: profile.tenantId?.gstin || '',
                pan: profile.tenantId?.pan || '',
                stateName: profile.tenantId?.stateName || '',
                stateCode: profile.tenantId?.stateCode || '',
                invoiceFormat: profile.tenantId?.invoiceFormat || 'modern',
            });
        }
    }, [profile]);

    const uploadToCloudinary = async (file: File, field: 'logoUrl' | 'signature') => {
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

        if (!cloudName || !uploadPreset) {
            showToast('Cloudinary is not configured on the frontend. Please add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to .env', 'error');
            return;
        }

        setUploading(field === 'logoUrl' ? 'logo' : 'signature');
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);

        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            
            if (data.secure_url) {
                setFormData(prev => ({ ...prev, [field]: data.secure_url }));
                showToast(`${field === 'logoUrl' ? 'Logo' : 'Signature'} uploaded to cloud`, 'success');
            } else {
                throw new Error(data.error?.message || 'Upload failed');
            }
        } catch (error: any) {
            showToast(error.message || 'Upload failed', 'error');
        } finally {
            setUploading(null);
        }
    };

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            return axios.put('/api/auth/profile', data);
        },
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            setUser(res.data);
            showToast('Settings updated successfully!', 'success');
        },
        onError: (err: any) => {
            showToast(err.response?.data?.message || 'Failed to update settings', 'error');
        },
        onSettled: () => {
            setSaving(false);
        }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        updateMutation.mutate(formData);
    };

    const deleteMutation = useMutation({
        mutationFn: async () => {
            return axios.delete('/api/auth/account');
        },
        onSuccess: () => {
            setIsDeleteModalOpen(false);
            showToast('Account deleted successfully', 'success');
            logout();
        },
        onError: (err: any) => {
            showToast(err.response?.data?.message || 'Failed to delete account', 'error');
            setIsDeleteModalOpen(false);
        }
    });

    const handleDeleteAccount = () => {
        deleteMutation.mutate();
    };

    const handleCreateStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingStaff(true);
        try {
            await axios.post('/api/auth/staff', staffFormData);
            showToast('Staff account created successfully', 'success');
            setStaffFormData({ name: '', email: '', password: '' });
            setShowStaffModal(false);
            refetchStaff();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to create staff account', 'error');
        } finally {
            setCreatingStaff(false);
        }
    };

    const handleDeleteStaff = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this staff account?')) return;
        try {
            await axios.delete(`/api/auth/staff/${id}`);
            showToast('Staff account deleted successfully', 'success');
            refetchStaff();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to delete staff account', 'error');
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
                <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase">{t('settings.title')}</h1>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2 opacity-60">{t('settings.identity_org_management')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Identity Card */}
                <div className="card p-6 md:p-10 bg-white shadow-2xl shadow-slate-200 border-none rounded-[1.5rem] md:rounded-[2.5rem] relative overflow-hidden group">
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
                                <p className="text-[9px] text-slate-400 font-bold ml-1 italic">{t('settings.email_security_msg')}</p>
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
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.company_logo')}</label>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
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
                                        <button 
                                            type="button" 
                                            onClick={() => logoInputRef.current?.click()} 
                                            disabled={!!uploading}
                                            className="flex items-center gap-2 px-5 py-3 bg-primary-50 text-primary-600 rounded-2xl font-black uppercase tracking-widest text-xs border border-primary-200 hover:bg-primary-100 transition-all disabled:opacity-50"
                                        >
                                            {uploading === 'logo' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} 
                                            {uploading === 'logo' ? t('settings.uploading') : t('settings.upload_logo')}
                                        </button>
                                        <p className="text-[10px] text-slate-400 mt-2 ml-1">{t('settings.cloudinary_msg')}</p>
                                        <input ref={logoInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) { 
                                                if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5MB', 'error'); return; } 
                                                uploadToCloudinary(file, 'logoUrl'); 
                                            }
                                        }} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.company_reg_name')}</label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input type="text" className="input pl-11 py-4 font-bold bg-slate-50 border-none rounded-2xl" value={formData.companyName} onChange={(e) => setFormData({...formData, companyName: e.target.value})} required />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.billing_address_label')}</label>
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
                                        <p className="text-[9px] text-emerald-600 font-bold ml-1">Used for WhatsApp Catalog Orders. Prefix 91 for India.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.billing_email_label')}</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                            <input type="email" className="input pl-11 py-4 font-bold bg-slate-50 border-none rounded-2xl" value={formData.billingEmail} onChange={(e) => setFormData({...formData, billingEmail: e.target.value})} placeholder="billing@yourcompany.com" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.office_address_label')}</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-4 text-slate-400 w-4 h-4" />
                                    <textarea className="input pl-11 py-4 font-bold bg-slate-50 border-none min-h-[100px] rounded-2xl" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder={t('placeholders.address')} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.upi_id_label')}</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">UPI</div>
                                    <input type="text" className="input pl-14 py-4 font-bold bg-slate-50 border-none rounded-2xl" value={formData.upiId} onChange={(e) => setFormData({...formData, upiId: e.target.value})} placeholder="yourname@bank" />
                                </div>
                                <p className="text-[9px] text-slate-400 font-bold ml-1 italic">Used to generate dynamic payment QR codes on bills</p>
                            </div>

                            {/* Signature Upload */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.digital_signature')}</label>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
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
                                        <button 
                                            type="button" 
                                            onClick={() => sigInputRef.current?.click()} 
                                            disabled={!!uploading}
                                            className="flex items-center gap-2 px-5 py-3 bg-emerald-50 text-emerald-600 rounded-2xl font-black uppercase tracking-widest text-xs border border-emerald-200 hover:bg-emerald-100 transition-all disabled:opacity-50"
                                        >
                                            {uploading === 'signature' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                            {uploading === 'signature' ? t('settings.uploading') : t('settings.upload_signature')}
                                        </button>
                                        <p className="text-[10px] text-slate-400 mt-2 ml-1">{t('settings.png_msg')}</p>
                                        <input ref={sigInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) { 
                                                if (file.size > 2 * 1024 * 1024) { showToast('Signature must be under 2MB', 'error'); return; } 
                                                uploadToCloudinary(file, 'signature'); 
                                            }
                                        }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* GST & Compliance Card */}
                <div className="card p-10 bg-white shadow-2xl shadow-slate-200 border-none rounded-[2.5rem] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 text-slate-50 opacity-10 group-hover:scale-110 transition-transform">
                        <ShieldCheck size={120} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                <ShieldCheck size={24} />
                            </div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">GST & Compliance</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GSTIN</label>
                                <input type="text" className="input py-4 font-bold bg-slate-50 border-none rounded-2xl" value={formData.gstin} onChange={(e) => setFormData({...formData, gstin: e.target.value.toUpperCase()})} placeholder="27AAAAA0000A1Z5" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PAN Number</label>
                                <input type="text" className="input py-4 font-bold bg-slate-50 border-none rounded-2xl" value={formData.pan} onChange={(e) => setFormData({...formData, pan: e.target.value.toUpperCase()})} placeholder="ABCDE1234F" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">State Name</label>
                                <input type="text" className="input py-4 font-bold bg-slate-50 border-none rounded-2xl" value={formData.stateName} onChange={(e) => setFormData({...formData, stateName: e.target.value})} placeholder="Bihar" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">State Code</label>
                                <input type="text" className="input py-4 font-bold bg-slate-50 border-none rounded-2xl" value={formData.stateCode} onChange={(e) => setFormData({...formData, stateCode: e.target.value})} placeholder="10" />
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
                                    <option value="en">{t('settings.english_lang')}</option>
                                    <option value="hi">{t('settings.hindi_lang')}</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Default Invoice Format</label>
                                <select className="input py-4 font-bold bg-slate-50 border-none rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors" value={formData.invoiceFormat} onChange={(e) => setFormData({...formData, invoiceFormat: e.target.value as any})}>
                                    <option value="thermal">Thermal Receipt (80mm)</option>
                                    <option value="modern">Modern Professional (A4)</option>
                                    <option value="gst">GST Tax Invoice (A4)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Subscription Card */}
                <div className="card p-6 md:p-10 bg-slate-900 border-none rounded-[1.5rem] md:rounded-[2.5rem] relative overflow-hidden group">
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
                                    <span className="text-2xl font-black text-white uppercase tracking-tighter">{user?.planType || 'Free'} {t('settings.plan_text')}</span>
                                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">Active</span>
                                </div>
                            </div>
                        </div>
                        <NavLink to="/dashboard/pricing" className="w-full md:w-auto btn-primary-white px-8 py-4 text-[10px] font-black uppercase tracking-widest rounded-xl bg-white text-slate-900 hover:bg-slate-100 flex items-center justify-center gap-3">
                            {t('settings.manage_plan')} <ArrowRight size={16} />
                        </NavLink>
                    </div>
                </div>

                {/* Support & Feedback Card */}
                <div className="card p-10 bg-white shadow-2xl shadow-slate-200 border-none rounded-[2.5rem] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 text-slate-50 opacity-10 group-hover:scale-110 transition-transform">
                        <MessageSquare size={120} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                <MessageSquare size={24} />
                            </div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Support & Feedback</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <NavLink to="/dashboard/contact" className="p-6 bg-slate-50 rounded-3xl hover:bg-slate-100 transition-all group/card border border-transparent hover:border-slate-200">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-600 mb-4 shadow-sm group-hover/card:text-primary-600 transition-colors">
                                    <Mail size={20} />
                                </div>
                                <h4 className="font-black text-slate-800 mb-1">Contact Us</h4>
                                <p className="text-[10px] text-slate-500 font-medium">Get in touch with our team</p>
                            </NavLink>
                            <NavLink to="/dashboard/contact?subject=Report%20a%20Bug" className="p-6 bg-slate-50 rounded-3xl hover:bg-rose-50 transition-all group/card border border-transparent hover:border-rose-100">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-600 mb-4 shadow-sm group-hover/card:text-rose-600 transition-colors">
                                    <Bug size={20} />
                                </div>
                                <h4 className="font-black text-slate-800 mb-1">Report Bug</h4>
                                <p className="text-[10px] text-slate-500 font-medium">Help us improve BuildMate</p>
                            </NavLink>
                            <NavLink to="/dashboard/contact?subject=Request%20a%20Feature" className="p-6 bg-slate-50 rounded-3xl hover:bg-emerald-50 transition-all group/card border border-transparent hover:border-emerald-100">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-600 mb-4 shadow-sm group-hover/card:text-emerald-600 transition-colors">
                                    <Lightbulb size={20} />
                                </div>
                                <h4 className="font-black text-slate-800 mb-1">Request Feature</h4>
                                <p className="text-[10px] text-slate-500 font-medium">Share your ideas with us</p>
                            </NavLink>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4 pb-12">
                    <button type="submit" disabled={saving} className="btn-primary px-12 py-5 text-sm font-black uppercase tracking-[0.2em] shadow-2xl hover:shadow-primary-300 flex items-center gap-4 rounded-2xl active:scale-[0.98] transition-all">
                        {saving ? (<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>) : (<Save size={20} />)}
                        {t('common.save')}
                    </button>
                </div>
            </form>

            {/* Staff Management Card */}
            {user?.role === 'owner' && (
                <div className="card p-10 bg-white shadow-2xl shadow-slate-200 border-none rounded-[2.5rem] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 text-slate-50 opacity-10 group-hover:scale-110 transition-transform">
                        <Users size={120} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                    <Users size={24} />
                                </div>
                                <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Staff Logins</h2>
                            </div>
                            <button 
                                onClick={() => {
                                    const currentCount = staffUsers.length;
                                    const plan = user?.planType || 'free';

                                    if (plan === 'free') {
                                        showToast('Staff Login accounts are only available in Basic & Business plans.', 'info');
                                        navigate('/dashboard/pricing');
                                        return;
                                    }

                                    if (plan === 'basic' && currentCount >= 1) {
                                        showToast('Basic Plan is limited to 1 staff login account. Upgrade to Business for more.', 'info');
                                        navigate('/dashboard/pricing');
                                        return;
                                    }

                                    if (plan === 'business' && currentCount >= 5) {
                                        showToast('Business Pro Plan is limited to 5 staff login accounts.', 'info');
                                        return;
                                    }

                                    setShowStaffModal(true);
                                }}
                                className="px-5 py-2.5 bg-primary-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-primary-700 transition-all flex items-center gap-2 shadow-lg shadow-primary-100"
                            >
                                <Plus size={16} /> Add Staff Account
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {staffUsers.length === 0 ? (
                                <div className="col-span-2 py-10 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No staff login accounts created yet</p>
                                </div>
                            ) : (
                                staffUsers.map((s: any) => (
                                    <div key={s._id} className="p-5 bg-slate-50 rounded-2xl flex items-center justify-between group/item hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary-600 font-black shadow-sm">
                                                {s.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800 uppercase tracking-tight">{s.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold tracking-widest">{s.email}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteStaff(s._id)}
                                            className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                            title="Delete Account"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                        <p className="mt-6 text-[10px] text-slate-400 font-bold flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <AlertCircle size={14} className="text-primary-500" />
                            Staff accounts can create bills but cannot see Profit, Reports, or Settings.
                        </p>
                    </div>
                </div>
            )}

            {/* Digital Catalog Section */}
            {user?.role === 'owner' && (
                <div className="card p-10 bg-white shadow-2xl shadow-emerald-100/50 border border-emerald-100 rounded-[2.5rem] relative overflow-hidden group mb-8">
                    {!canUseFeature(user?.planType || 'free', 'hasDigitalCatalog') && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center text-center p-6">
                            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 shadow-sm">
                                <Lock size={32} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase mb-2">Digital Catalog Locked</h3>
                            <p className="text-slate-500 text-sm font-medium max-w-xs mb-6">
                                Launch your online shop and take orders on WhatsApp with our Basic & Business plans.
                            </p>
                            <button 
                                onClick={() => navigate('/pricing')}
                                className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2"
                            >
                                Upgrade Now <ArrowRight size={14} />
                            </button>
                        </div>
                    )}
                    <div className="absolute top-0 right-0 p-8 text-emerald-50 opacity-50 group-hover:scale-110 transition-transform -z-0">
                        <Globe size={120} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                                <Globe size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Digital Catalog</h2>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Share your products with the world</p>
                            </div>
                        </div>

                        <div className="space-y-6 max-w-2xl">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Your Shop URL Slug</label>
                                <div className="flex items-center gap-2">
                                    <div className="bg-slate-100 px-4 py-3 rounded-2xl text-slate-500 font-bold text-sm border border-slate-200">
                                        buildmate.com/catalog/
                                    </div>
                                    <input 
                                        type="text"
                                        className="flex-grow bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
                                        placeholder="your-shop-name"
                                        value={formData.slug}
                                        onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium ml-1">This will be your public shop link. Use letters, numbers, and dashes only.</p>
                            </div>

                            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white rounded-xl shadow-sm text-primary-600">
                                        <Link size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your Public Link</p>
                                        <p className="text-sm font-bold text-slate-700 truncate max-w-[200px] sm:max-w-md">
                                            {window.location.origin}/catalog/{formData.slug || 'your-slug'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/catalog/${formData.slug}`);
                                            showToast('Link copied to clipboard!', 'success');
                                        }}
                                        className="flex-grow sm:flex-grow-0 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs border border-slate-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        Copy Link
                                    </button>
                                    <a 
                                        href={`/catalog/${formData.slug}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex-grow sm:flex-grow-0 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        Visit Shop <ExternalLink size={14} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Danger Zone */}
            {user?.role === 'owner' && (
                <div className="card p-10 bg-white shadow-2xl shadow-rose-100/50 border border-rose-100 rounded-[2.5rem] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 text-rose-50 opacity-50 group-hover:scale-110 transition-transform -z-0">
                        <Trash2 size={120} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 shadow-sm">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-rose-600 tracking-tight uppercase">Danger Zone</h2>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 font-medium mb-6">
                            Once you delete your account, there is no going back. Please be certain.
                            This will permanently delete all data including products, customers, sales, and your organization profile.
                        </p>
                        <button
                            type="button"
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="px-6 py-3 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-2xl font-black uppercase tracking-widest text-xs border border-rose-200 hover:border-rose-600 transition-all flex items-center gap-2"
                        >
                            <Trash2 size={16} /> Delete My Account
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 mb-6 mx-auto">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-2xl font-black text-center text-slate-900 uppercase tracking-tight mb-2">Delete Account?</h3>
                        <p className="text-center text-slate-500 font-medium text-sm mb-8">
                            Are you absolutely sure you want to delete your account? This action cannot be undone and will permanently erase all your data.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleteMutation.isPending}
                                className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {deleteMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete My Account'}
                            </button>
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                disabled={deleteMutation.isPending}
                                className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black uppercase tracking-widest text-xs transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Create Staff Modal */}
            {showStaffModal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Create Staff Login</h3>
                            <button onClick={() => setShowStaffModal(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateStaff} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Staff Name</label>
                                <input 
                                    type="text" 
                                    required 
                                    className="input py-4 font-bold bg-slate-50 border-none rounded-2xl" 
                                    placeholder="Full Name"
                                    value={staffFormData.name}
                                    onChange={(e) => setStaffFormData({...staffFormData, name: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                <input 
                                    type="email" 
                                    required 
                                    className="input py-4 font-bold bg-slate-50 border-none rounded-2xl" 
                                    placeholder="staff@buildmate.com"
                                    value={staffFormData.email}
                                    onChange={(e) => setStaffFormData({...staffFormData, email: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                                <input 
                                    type="password" 
                                    required 
                                    minLength={6}
                                    className="input py-4 font-bold bg-slate-50 border-none rounded-2xl" 
                                    placeholder="Create password"
                                    value={staffFormData.password}
                                    onChange={(e) => setStaffFormData({...staffFormData, password: e.target.value})}
                                />
                            </div>
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={creatingStaff}
                                    className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-primary-100 flex items-center justify-center gap-2"
                                >
                                    {creatingStaff ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    {creatingStaff ? 'Creating...' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Settings;
