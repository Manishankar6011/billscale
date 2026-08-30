import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { NavLink, useNavigate } from 'react-router-dom';
import { User, Building2, Phone, MapPin, Save, ShieldCheck, Crown, ArrowRight, Upload, Image, Mail, Pen, X, AlertCircle, Loader2, MessageSquare, Bug, Lightbulb, Trash2, AlertTriangle, Users, Plus, Link, ExternalLink, Globe, Settings as SettingsIcon, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { canUseFeature } from '../utils/planLimits';
import { Lock } from 'lucide-react';
import { cn } from '../lib/utils';

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

    // Custom Domain State
    const [customDomainInput, setCustomDomainInput] = useState('');
    const [customDomainStatus, setCustomDomainStatus] = useState<'pending' | 'active' | 'failed' | ''>('');
    const [savedCustomDomain, setSavedCustomDomain] = useState('');
    const [domainSaving, setDomainSaving] = useState(false);
    const [domainVerifying, setDomainVerifying] = useState(false);
    const [domainRemoving, setDomainRemoving] = useState(false);

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
            // Load saved custom domain info
            setSavedCustomDomain(profile.tenantId?.customDomain || '');
            setCustomDomainInput(profile.tenantId?.customDomain || '');
            setCustomDomainStatus(profile.tenantId?.customDomainStatus || '');
        }
    }, [profile]);

    const handleSaveCustomDomain = async () => {
        if (!customDomainInput.trim()) return;
        setDomainSaving(true);
        try {
            const res = await axios.post('/api/catalog/custom-domain/save', { domain: customDomainInput.trim() });
            setSavedCustomDomain(res.data.customDomain);
            setCustomDomainStatus('pending');
            showToast('Domain saved! Now add the CNAME record and verify.', 'success');
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to save domain', 'error');
        } finally {
            setDomainSaving(false);
        }
    };

    const handleVerifyCustomDomain = async () => {
        setDomainVerifying(true);
        try {
            const res = await axios.post('/api/catalog/custom-domain/verify');
            setCustomDomainStatus('active');
            showToast(res.data.message, 'success');
        } catch (err: any) {
            setCustomDomainStatus('failed');
            showToast(err.response?.data?.message || 'Verification failed', 'error');
        } finally {
            setDomainVerifying(false);
        }
    };

    const handleRemoveCustomDomain = async () => {
        if (!window.confirm('Are you sure you want to remove your custom domain?')) return;
        setDomainRemoving(true);
        try {
            await axios.delete('/api/catalog/custom-domain/remove');
            setSavedCustomDomain('');
            setCustomDomainInput('');
            setCustomDomainStatus('');
            showToast('Custom domain removed successfully.', 'success');
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to remove domain', 'error');
        } finally {
            setDomainRemoving(false);
        }
    };

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

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
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

    const tabs = [
        { id: 'account', label: t('settings.personnel'), icon: User, color: 'bg-indigo-500' },
        { id: 'business', label: t('settings.organization'), icon: Building2, color: 'bg-emerald-500' },
        { id: 'billing', label: 'GST & Subscription', icon: ShieldCheck, color: 'bg-blue-500' },
        { id: 'staff', label: 'Staff Logins', icon: Users, color: 'bg-purple-500', ownerOnly: true },
        { id: 'catalog', label: 'Digital Catalog', icon: Globe, color: 'bg-teal-500', ownerOnly: true },
        { id: 'system', label: 'Preferences', icon: Save, color: 'bg-orange-500' },
        { id: 'support', label: 'Support', icon: MessageSquare, color: 'bg-rose-500' },
        { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, color: 'bg-red-500', ownerOnly: true },
    ];

    const [activeTab, setActiveTab] = useState('account');

    if (loading) return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">{t('common.loading')}</p>
        </div>
    );

    return (
        <div className=" mx-auto pb-20 animate-in fade-in duration-700 px-4 md:px-0 overflow-hidden">
            {/* Header */}
            <div 
                style={{ maxWidth: 'stretch' }}
                className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 md:mb-10 bg-white/50 p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/40 backdrop-blur-md shadow-sm ring-1 ring-slate-200/50"
            >
                <div className="flex items-center gap-4 md:gap-5">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-xl shadow-slate-200 transition-transform hover:scale-105 duration-500">
                        <SettingsIcon className="text-white w-6 h-6 md:w-8 md:h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight leading-none mb-1">{t('settings.title')}</h1>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[8px] md:text-[10px] opacity-60 flex items-center gap-2">
                            <ShieldCheck size={10} className="text-primary-500 md:w-3 md:h-3" />
                            {t('settings.identity_org_management')}
                        </p>
                    </div>
                </div>

                <button 
                    onClick={() => handleSubmit()} 
                    disabled={saving} 
                    className="btn-primary px-8 md:px-10 py-3 md:py-4 text-[10px] md:text-xs font-black uppercase tracking-widest shadow-xl hover:shadow-primary-300 flex items-center justify-center gap-3 rounded-xl md:rounded-2xl active:scale-[0.98] transition-all group"
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover:scale-110 transition-transform" />}
                    {t('common.save')}
                </button>
            </div>

            <div 
                style={{ maxWidth: 'stretch' }}
                className="flex flex-col lg:flex-row gap-6 md:gap-10 items-start w-full"
            >
                <div className="w-full lg:w-72 shrink-0 bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl shadow-slate-200/30 rounded-[1.5rem] md:rounded-[2.5rem] p-1 md:p-4 sticky top-16 md:top-24 z-30 overflow-hidden">
                    <nav className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible p-1 gap-2 custom-horizontal-scrollbar w-full">
                        {tabs.filter(t => !t.ownerOnly || user?.role === 'owner').map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-3 md:gap-4 px-4 md:px-5 py-2.5 md:py-4 rounded-xl md:rounded-2xl text-left transition-all duration-300 group whitespace-nowrap lg:whitespace-normal shrink-0 lg:shrink",
                                    activeTab === tab.id 
                                        ? "bg-slate-900 text-white shadow-lg shadow-slate-200 scale-[1.02] lg:scale-105 z-10" 
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                                )}
                            >
                                <div className={cn(
                                    "w-7 h-7 md:w-8 md:h-8 rounded-lg md:rounded-xl flex items-center justify-center transition-colors",
                                    activeTab === tab.id ? "bg-white/10" : "bg-slate-100 group-hover:bg-white"
                                )}>
                                    <tab.icon size={16} className={activeTab === tab.id ? "text-white" : "text-slate-400"} />
                                </div>
                                <span className="font-black uppercase tracking-widest text-[9px] md:text-[10px]">{tab.label}</span>
                                {activeTab === tab.id && <ChevronRight size={14} className="ml-auto opacity-50 hidden lg:block" />}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="flex-1 w-full min-w-0">
                    <div className="card p-6 md:p-12 bg-white/70 backdrop-blur-xl border border-white/40 shadow-2xl shadow-slate-200/50 rounded-[2rem] md:rounded-[3rem] min-h-[400px] md:min-h-[600px]">
                        {activeTab === 'account' && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">{t('settings.personnel')}</h3>
                                        <p className="text-xs text-slate-400 font-medium">Manage your personal identity and security</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('common.name')}</label>
                                        <div className="relative group">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors w-4 h-4" />
                                            <input 
                                                type="text" 
                                                className="input pl-12 py-4 font-bold bg-slate-50 border-none transition-all focus:ring-2 focus:ring-indigo-500/20 focus:bg-white rounded-2xl w-full" 
                                                value={formData.name} 
                                                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                                                required 
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('common.email')}</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                                            <input 
                                                type="email" 
                                                className="input pl-12 py-4 font-bold bg-slate-100 border-none text-slate-400 cursor-not-allowed rounded-2xl w-full" 
                                                value={user?.email} 
                                                disabled 
                                            />
                                        </div>
                                        <p className="text-[9px] text-slate-400 font-bold ml-1 flex items-center gap-1">
                                            <ShieldCheck size={10} className="text-emerald-500" />
                                            {t('settings.email_security_msg')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'business' && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                                        <Building2 size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">{t('settings.organization')}</h3>
                                        <p className="text-xs text-slate-400 font-medium">Configure your business branding and contact info</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.company_logo')}</label>
                                            <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200 group/upload relative overflow-hidden">
                                                {formData.logoUrl ? (
                                                    <div className="relative shrink-0">
                                                        <img src={formData.logoUrl} alt="Logo" className="w-24 h-24 object-contain rounded-2xl bg-white p-2 shadow-sm border border-slate-100" />
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setFormData(f => ({ ...f, logoUrl: '' }))} 
                                                            className="absolute -top-3 -right-3 w-8 h-8 bg-white text-rose-500 rounded-full flex items-center justify-center shadow-lg hover:bg-rose-500 hover:text-white transition-all active:scale-90"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 bg-white flex items-center justify-center shrink-0">
                                                        <Image size={32} className="text-slate-300" />
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => logoInputRef.current?.click()} 
                                                        disabled={!!uploading}
                                                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white text-slate-800 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-slate-200 shadow-sm hover:shadow-md hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
                                                    >
                                                        {uploading === 'logo' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} 
                                                        {uploading === 'logo' ? 'Wait...' : 'Pick Logo'}
                                                    </button>
                                                    <p className="text-[9px] text-slate-400 mt-3 font-medium text-center">PNG/JPG under 5MB</p>
                                                    <input ref={logoInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) uploadToCloudinary(file, 'logoUrl'); 
                                                    }} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.digital_signature')}</label>
                                            <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                                                {formData.signature ? (
                                                    <div className="relative shrink-0">
                                                        <img src={formData.signature} alt="Signature" className="h-16 w-32 object-contain rounded-2xl bg-white px-2 shadow-sm border border-slate-100" />
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setFormData(f => ({ ...f, signature: '' }))} 
                                                            className="absolute -top-3 -right-3 w-8 h-8 bg-white text-rose-500 rounded-full flex items-center justify-center shadow-lg hover:bg-rose-500 hover:text-white transition-all active:scale-90"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="h-16 w-32 rounded-2xl border-2 border-dashed border-slate-200 bg-white flex items-center justify-center shrink-0">
                                                        <Pen size={24} className="text-slate-300" />
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => sigInputRef.current?.click()} 
                                                        disabled={!!uploading}
                                                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-800 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-slate-200 shadow-sm hover:shadow-md hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
                                                    >
                                                        {uploading === 'signature' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                                        {uploading === 'signature' ? 'Wait...' : 'Pick Signature'}
                                                    </button>
                                                    <input ref={sigInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) uploadToCloudinary(file, 'signature'); 
                                                    }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.company_reg_name')}</label>
                                            <div className="relative group">
                                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors w-4 h-4" />
                                                <input 
                                                    type="text" 
                                                    className="input pl-12 py-4 font-bold bg-slate-50 border-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white rounded-2xl w-full transition-all" 
                                                    value={formData.companyName} 
                                                    onChange={(e) => setFormData({...formData, companyName: e.target.value})} 
                                                    required 
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('common.phone')}</label>
                                            <div className="relative group">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors w-4 h-4" />
                                                <input 
                                                    type="tel" 
                                                    className="input pl-12 py-4 font-bold bg-slate-50 border-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white rounded-2xl w-full transition-all" 
                                                    value={formData.phone} 
                                                    onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                                                    placeholder="e.g. 919876543210" 
                                                />
                                            </div>
                                            <p className="text-[9px] text-emerald-600 font-bold ml-1 flex items-center gap-1">
                                                <MessageSquare size={10} /> Used for WhatsApp Catalog orders.
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.billing_address_label')}</label>
                                            <div className="relative group">
                                                <MapPin className="absolute left-4 top-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors w-4 h-4" />
                                                <textarea 
                                                    className="input pl-12 py-4 font-bold bg-slate-50 border-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white rounded-2xl w-full min-h-[100px] transition-all" 
                                                    value={formData.billingAddress} 
                                                    onChange={(e) => setFormData({...formData, billingAddress: e.target.value})} 
                                                    placeholder="Full shop address..." 
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.upi_id_label')}</label>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">UPI</div>
                                                <input 
                                                    type="text" 
                                                    className="input pl-14 py-4 font-bold bg-slate-50 border-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white rounded-2xl w-full transition-all" 
                                                    value={formData.upiId} 
                                                    onChange={(e) => setFormData({...formData, upiId: e.target.value})} 
                                                    placeholder="yourname@bank" 
                                                />
                                            </div>
                                            <p className="text-[9px] text-slate-400 font-bold ml-1 italic">Used for dynamic QR codes on bills</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'billing' && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                                        <ShieldCheck size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">GST & Subscription</h3>
                                        <p className="text-xs text-slate-400 font-medium">Manage tax identification and plan details</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GSTIN</label>
                                        <input 
                                            type="text" 
                                            className="input py-4 font-bold bg-slate-50 border-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white rounded-2xl w-full transition-all" 
                                            value={formData.gstin} 
                                            onChange={(e) => setFormData({...formData, gstin: e.target.value.toUpperCase()})} 
                                            placeholder="27AAAAA0000A1Z5" 
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PAN Number</label>
                                        <input 
                                            type="text" 
                                            className="input py-4 font-bold bg-slate-50 border-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white rounded-2xl w-full transition-all" 
                                            value={formData.pan} 
                                            onChange={(e) => setFormData({...formData, pan: e.target.value.toUpperCase()})} 
                                            placeholder="ABCDE1234F" 
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">State Name</label>
                                        <input 
                                            type="text" 
                                            className="input py-4 font-bold bg-slate-50 border-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white rounded-2xl w-full transition-all" 
                                            value={formData.stateName} 
                                            onChange={(e) => setFormData({...formData, stateName: e.target.value})} 
                                            placeholder="Bihar" 
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">State Code</label>
                                        <input 
                                            type="text" 
                                            className="input py-4 font-bold bg-slate-50 border-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white rounded-2xl w-full transition-all" 
                                            value={formData.stateCode} 
                                            onChange={(e) => setFormData({...formData, stateCode: e.target.value})} 
                                            placeholder="10" 
                                        />
                                    </div>
                                </div>

                                <div className="p-8 bg-slate-900 rounded-[2.5rem] relative overflow-hidden group/plan">
                                    <div className="absolute top-0 right-0 p-8 text-white opacity-5 group-hover/plan:scale-110 transition-transform">
                                        <Crown size={120} />
                                    </div>
                                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white backdrop-blur-md">
                                                    <Crown className="text-amber-400" size={24} />
                                                </div>
                                                <h2 className="text-xl font-black text-white tracking-tight uppercase">Active Plan</h2>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl font-black text-white uppercase tracking-tighter">{user?.planType || 'Free'} Plan</span>
                                                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">Active</span>
                                                </div>
                                            </div>
                                        </div>
                                        <NavLink to="/dashboard/pricing" className="w-full md:w-auto px-8 py-4 bg-white text-slate-900 hover:bg-slate-50 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-3">
                                            Upgrade Plan <ArrowRight size={16} />
                                        </NavLink>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'staff' && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                                            <Users size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Staff Logins</h3>
                                            <p className="text-xs text-slate-400 font-medium">Create restricted accounts for your employees</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            const currentCount = staffUsers.length;
                                            const plan = user?.planType || 'free';
                                            if (plan === 'free') { navigate('/dashboard/pricing'); return; }
                                            if (plan === 'basic' && currentCount >= 1) { navigate('/dashboard/pricing'); return; }
                                            if (plan === 'business' && currentCount >= 5) { return; }
                                            setShowStaffModal(true);
                                        }}
                                        className="px-6 py-3 bg-purple-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-purple-700 transition-all flex items-center gap-2 shadow-lg shadow-purple-100 active:scale-95"
                                    >
                                        <Plus size={16} /> Add Staff
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {staffUsers.length === 0 ? (
                                        <div className="col-span-full py-16 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center">
                                            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-slate-200 mb-4">
                                                <Users size={32} />
                                            </div>
                                            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No staff accounts created yet</p>
                                        </div>
                                    ) : (
                                        staffUsers.map((s: any) => (
                                            <div key={s._id} className="p-6 bg-slate-50/50 rounded-3xl flex items-center justify-between group/item hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all border border-transparent hover:border-slate-100">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-purple-600 font-black shadow-sm ring-1 ring-slate-100">
                                                        {s.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-800 uppercase tracking-tight">{s.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold tracking-widest flex items-center gap-1">
                                                            <Mail size={10} /> {s.email}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleDeleteStaff(s._id)}
                                                    className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all active:scale-90"
                                                    title="Delete Account"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="p-5 bg-purple-50 rounded-3xl border border-purple-100 flex items-start gap-4">
                                    <div className="p-2 bg-white rounded-xl text-purple-600 shadow-sm mt-0.5">
                                        <ShieldCheck size={18} />
                                    </div>
                                    <p className="text-[11px] text-purple-900/60 font-bold leading-relaxed">
                                        <span className="text-purple-900 block mb-1 uppercase tracking-widest text-[10px]">Security Note:</span>
                                        Staff accounts can only create bills. They are restricted from viewing Profit/Loss, Reports, Analytics, or Settings.
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'catalog' && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                                    <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center">
                                        <Globe size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Digital Catalog</h3>
                                        <p className="text-xs text-slate-400 font-medium">Launch your online storefront in seconds</p>
                                    </div>
                                </div>

                                {!canUseFeature(user?.planType || 'free', 'hasDigitalCatalog') ? (
                                    <div className="py-20 text-center flex flex-col items-center">
                                        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-emerald-50">
                                            <Lock size={32} />
                                        </div>
                                        <h4 className="text-2xl font-black text-slate-800 tracking-tight uppercase mb-3">Feature Locked</h4>
                                        <p className="text-slate-500 text-sm font-medium max-w-sm mb-10 leading-relaxed">
                                            Digital Catalog and WhatsApp Ordering are premium features available in Basic & Business plans.
                                        </p>
                                        <button 
                                            onClick={() => navigate('/dashboard/pricing')}
                                            className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-3 active:scale-95"
                                        >
                                            Upgrade Now <ArrowRight size={18} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {/* ── Slug Section ── */}
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Your Shop URL Slug</label>
                                            <div className="flex flex-col sm:flex-row items-stretch gap-2">
                                                <div className="bg-slate-100 px-6 py-4 rounded-2xl text-slate-500 font-black text-xs border border-slate-200 flex items-center">
                                                    buildmate.com/catalog/
                                                </div>
                                                <input 
                                                    type="text"
                                                    className="flex-grow bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-black focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all outline-none"
                                                    placeholder="your-shop-name"
                                                    value={formData.slug}
                                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                                />
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-bold ml-1 italic">Use letters, numbers, and dashes only.</p>
                                        </div>

                                        {/* ── Public Store Link Card ── */}
                                        <div className="p-8 bg-slate-900 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden group/link">
                                            <div className="absolute -right-10 -bottom-10 p-12 text-white/5 opacity-20 group-hover/link:scale-110 transition-transform">
                                                <ExternalLink size={160} />
                                            </div>
                                            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                                                <div className="flex items-center gap-5">
                                                    <div className="p-4 bg-white/10 rounded-2xl text-emerald-400 backdrop-blur-md">
                                                        <Link size={24} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Your Public Store Link</p>
                                                        <p className="text-sm font-bold text-white truncate max-w-[200px] xs:max-w-[250px] md:max-w-md">
                                                            {window.location.origin}/catalog/{formData.slug || 'your-slug'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(`${window.location.origin}/catalog/${formData.slug}`);
                                                            showToast('Link copied to clipboard!', 'success');
                                                        }}
                                                        className="flex-1 sm:flex-none px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-black uppercase tracking-widest text-[10px] border border-white/10 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        Copy Link
                                                    </button>
                                                    <a 
                                                        href={`/catalog/${formData.slug}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex-1 sm:flex-none px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        Visit <ExternalLink size={14} />
                                                    </a>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ══════════════════════════════════════════════
                                             CUSTOM DOMAIN SECTION
                                        ══════════════════════════════════════════════ */}
                                        <div className="border-t border-slate-100 pt-8 space-y-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center">
                                                    <Globe size={16} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Custom Domain</h4>
                                                    <p className="text-[10px] text-slate-400 font-medium">Connect your own domain like <span className="font-black text-slate-600">shop.yourdomain.com</span></p>
                                                </div>
                                            </div>

                                            {/* Domain Input + Save */}
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Your Domain</label>
                                                <div className="flex flex-col sm:flex-row gap-3">
                                                    <input
                                                        id="custom-domain-input"
                                                        type="text"
                                                        className="flex-grow bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-violet-500/20 focus:bg-white focus:border-violet-300 transition-all outline-none placeholder:text-slate-300"
                                                        placeholder="shop.yourdomain.com"
                                                        value={customDomainInput}
                                                        onChange={(e) => setCustomDomainInput(e.target.value.toLowerCase().trim().replace(/^https?:\/\//, ''))}
                                                        disabled={domainSaving}
                                                    />
                                                    <button
                                                        id="btn-save-custom-domain"
                                                        type="button"
                                                        onClick={handleSaveCustomDomain}
                                                        disabled={domainSaving || !customDomainInput.trim() || customDomainInput.trim() === savedCustomDomain}
                                                        className="px-8 py-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-violet-500/20 transition-all flex items-center justify-center gap-2 whitespace-nowrap active:scale-95"
                                                    >
                                                        {domainSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                        {domainSaving ? 'Saving...' : 'Save Domain'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* DNS Instructions — shown only when domain is saved */}
                                            {savedCustomDomain && (
                                                <div className="p-6 bg-amber-50 border border-amber-200 rounded-[1.5rem] space-y-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-7 h-7 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                                                            <AlertCircle size={14} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-amber-800 mb-1">Step 1 — Add this CNAME record to your DNS provider</p>
                                                            <p className="text-[10px] text-amber-700 font-medium">Go to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.) and add:</p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white border border-amber-200 rounded-xl overflow-hidden">
                                                        <table className="w-full text-xs font-mono">
                                                            <thead>
                                                                <tr className="bg-amber-100/60">
                                                                    <th className="text-left px-4 py-2 text-amber-700 font-black uppercase tracking-widest text-[9px]">Type</th>
                                                                    <th className="text-left px-4 py-2 text-amber-700 font-black uppercase tracking-widest text-[9px]">Name / Host</th>
                                                                    <th className="text-left px-4 py-2 text-amber-700 font-black uppercase tracking-widest text-[9px]">Value / Target</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                <tr>
                                                                    <td className="px-4 py-3 text-slate-700 font-black">CNAME</td>
                                                                    <td className="px-4 py-3 text-violet-700 font-bold">{savedCustomDomain.split('.')[0]}</td>
                                                                    <td className="px-4 py-3 text-emerald-700 font-bold">cname.billscale.in</td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                    <p className="text-[10px] text-amber-600 font-bold italic ml-1">⏱ DNS changes can take 5 minutes to 48 hours to propagate.</p>
                                                </div>
                                            )}

                                            {/* Status + Verify/Remove */}
                                            {savedCustomDomain && (
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-sm font-bold text-slate-700 truncate">{savedCustomDomain}</div>
                                                        {customDomainStatus === 'active' && (
                                                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                                                Active
                                                            </span>
                                                        )}
                                                        {customDomainStatus === 'pending' && (
                                                            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                                                Pending DNS
                                                            </span>
                                                        )}
                                                        {customDomainStatus === 'failed' && (
                                                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                                                Failed
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2 w-full sm:w-auto">
                                                        {customDomainStatus !== 'active' && (
                                                            <button
                                                                id="btn-verify-custom-domain"
                                                                type="button"
                                                                onClick={handleVerifyCustomDomain}
                                                                disabled={domainVerifying}
                                                                className="flex-1 sm:flex-none px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl font-black uppercase tracking-widest text-[9px] shadow-md shadow-violet-200 transition-all flex items-center justify-center gap-2 active:scale-95"
                                                            >
                                                                {domainVerifying ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                                                                {domainVerifying ? 'Checking...' : 'Verify DNS'}
                                                            </button>
                                                        )}
                                                        {customDomainStatus === 'active' && (
                                                            <a
                                                                href={`https://${savedCustomDomain}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-[9px] shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                                                            >
                                                                Visit Store <ExternalLink size={11} />
                                                            </a>
                                                        )}
                                                        <button
                                                            id="btn-remove-custom-domain"
                                                            type="button"
                                                            onClick={handleRemoveCustomDomain}
                                                            disabled={domainRemoving}
                                                            className="flex-1 sm:flex-none px-5 py-2.5 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 rounded-xl font-black uppercase tracking-widest text-[9px] border border-red-100 transition-all flex items-center justify-center gap-2 active:scale-95"
                                                        >
                                                            {domainRemoving ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'system' && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                                    <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center">
                                        <Save size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">{t('settings.system_pref')}</h3>
                                        <p className="text-xs text-slate-400 font-medium">Customize your application experience</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('landing.choose_lang')}</label>
                                        <select 
                                            className="input py-4 font-black bg-slate-50 border-none rounded-2xl cursor-pointer hover:bg-slate-100 transition-all outline-none focus:ring-2 focus:ring-orange-500/20 w-full" 
                                            value={i18n.language} 
                                            onChange={(e) => i18n.changeLanguage(e.target.value)}
                                        >
                                            <option value="en">{t('settings.english_lang')}</option>
                                            <option value="hi">{t('settings.hindi_lang')}</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Default Invoice Format</label>
                                        <select 
                                            className="input py-4 font-black bg-slate-50 border-none rounded-2xl cursor-pointer hover:bg-slate-100 transition-all outline-none focus:ring-2 focus:ring-orange-500/20 w-full" 
                                            value={formData.invoiceFormat} 
                                            onChange={(e) => setFormData({...formData, invoiceFormat: e.target.value as any})}
                                        >
                                            <option value="thermal">Thermal Receipt (80mm)</option>
                                            <option value="modern">Modern Professional (A4)</option>
                                            <option value="gst">GST Tax Invoice (A4)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'support' && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                                    <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                                        <MessageSquare size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Support & Feedback</h3>
                                        <p className="text-xs text-slate-400 font-medium">We're here to help you grow your business</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <NavLink to="/dashboard/contact" className="p-8 bg-slate-50/50 rounded-[2.5rem] hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all group/card border border-transparent hover:border-slate-100">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 mb-6 shadow-sm group-hover/card:text-indigo-600 transition-colors">
                                            <Mail size={24} />
                                        </div>
                                        <h4 className="font-black text-slate-800 uppercase tracking-tight mb-2">Contact Us</h4>
                                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Direct support from our dedicated customer success team.</p>
                                    </NavLink>
                                    <NavLink to="/dashboard/contact?subject=Report%20a%20Bug" className="p-8 bg-slate-50/50 rounded-[2.5rem] hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all group/card border border-transparent hover:border-slate-100">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 mb-6 shadow-sm group-hover/card:text-rose-600 transition-colors">
                                            <Bug size={24} />
                                        </div>
                                        <h4 className="font-black text-slate-800 uppercase tracking-tight mb-2">Report Bug</h4>
                                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Found something broken? Let us know and we'll fix it ASAP.</p>
                                    </NavLink>
                                    <NavLink to="/dashboard/contact?subject=Request%20a%20Feature" className="p-8 bg-slate-50/50 rounded-[2.5rem] hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all group/card border border-transparent hover:border-slate-100">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 mb-6 shadow-sm group-hover/card:text-emerald-600 transition-colors">
                                            <Lightbulb size={24} />
                                        </div>
                                        <h4 className="font-black text-slate-800 uppercase tracking-tight mb-2">Request Feature</h4>
                                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Have an idea for a new tool? We build what our users want.</p>
                                    </NavLink>
                                </div>
                            </div>
                        )}

                        {activeTab === 'danger' && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                                    <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                                        <AlertTriangle size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-rose-600 tracking-tight uppercase">Danger Zone</h3>
                                        <p className="text-xs text-slate-400 font-medium">Critical account actions and data deletion</p>
                                    </div>
                                </div>

                                <div className="p-8 bg-rose-50 rounded-[2.5rem] border border-rose-100">
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                                        <div className="space-y-2">
                                            <h4 className="font-black text-rose-900 uppercase tracking-tight">Delete Account permanently</h4>
                                            <p className="text-xs text-rose-900/60 font-medium max-w-md leading-relaxed">
                                                This action will permanently delete all your data including inventory, sales, customers, and staff logins. This cannot be undone.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsDeleteModalOpen(true)}
                                            className="w-full md:w-auto px-8 py-4 bg-white text-rose-600 hover:bg-rose-600 hover:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] border border-rose-200 hover:border-rose-600 transition-all flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            <Trash2 size={16} /> Delete Account
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isDeleteModalOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-100">
                        <div className="w-20 h-20 bg-rose-100 rounded-[2rem] flex items-center justify-center text-rose-600 mb-8 mx-auto shadow-xl shadow-rose-100">
                            <AlertTriangle size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-center text-slate-900 uppercase tracking-tight mb-3">Delete Account?</h3>
                        <p className="text-center text-slate-500 font-medium text-sm mb-10 leading-relaxed">
                            Are you absolutely sure? All your business data will be permanently erased from our servers.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleteMutation.isPending}
                                className="w-full py-5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-rose-200"
                            >
                                {deleteMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                {deleteMutation.isPending ? 'Processing...' : 'Yes, Delete Everything'}
                            </button>
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="w-full py-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {showStaffModal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-100">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Add Staff Login</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Employee Access Control</p>
                            </div>
                            <button onClick={() => setShowStaffModal(false)} className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all active:scale-90">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateStaff} className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Staff Name</label>
                                <input 
                                    type="text" 
                                    required 
                                    className="input py-4 font-bold bg-slate-50 border-none rounded-2xl w-full outline-none focus:ring-2 focus:ring-purple-500/20 transition-all" 
                                    placeholder="Full Name"
                                    value={staffFormData.name}
                                    onChange={(e) => setStaffFormData({...staffFormData, name: e.target.value})}
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                <input 
                                    type="email" 
                                    required 
                                    className="input py-4 font-bold bg-slate-50 border-none rounded-2xl w-full outline-none focus:ring-2 focus:ring-purple-500/20 transition-all" 
                                    placeholder="staff@buildmate.com"
                                    value={staffFormData.email}
                                    onChange={(e) => setStaffFormData({...staffFormData, email: e.target.value})}
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                                <input 
                                    type="password" 
                                    required 
                                    minLength={6}
                                    className="input py-4 font-bold bg-slate-50 border-none rounded-2xl w-full outline-none focus:ring-2 focus:ring-purple-500/20 transition-all" 
                                    placeholder="Min 6 characters"
                                    value={staffFormData.password}
                                    onChange={(e) => setStaffFormData({...staffFormData, password: e.target.value})}
                                />
                            </div>
                            <div className="pt-4">
                                <button 
                                    type="submit" 
                                    disabled={creatingStaff}
                                    className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
                                >
                                    {creatingStaff ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
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
