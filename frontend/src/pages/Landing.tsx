import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Receipt, Users, ChevronRight, Globe, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import SEO from '../components/SEO';

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const Landing = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t, i18n } = useTranslation();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    const features = [
        {
            icon: Box,
            title: t('landing.inventory_tracking'),
            description: t('landing.inventory_desc'),
            color: 'text-blue-600',
            bg: 'bg-blue-50'
        },
        {
            icon: Receipt,
            title: t('landing.billing_accounting'),
            description: t('landing.billing_desc'),
            color: 'text-emerald-600',
            bg: 'bg-emerald-50'
        },
        {
            icon: Users,
            title: t('landing.staff_management'),
            description: t('landing.staff_desc'),
            color: 'text-purple-600',
            bg: 'bg-purple-50'
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-primary-100 selection:text-primary-900">
            <SEO />
            {/* Nav */}
            <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate('/')}>
                        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-200 group-hover:rotate-12 transition-transform">
                            <Package size={24} />
                        </div>
                        <span className="text-2xl font-black text-slate-800 tracking-tighter">BuildMate<span className="text-primary-600">ERP</span></span>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
                            <button 
                                onClick={() => changeLanguage('en')}
                                className={cn(
                                    "px-4 py-1.5 text-xs font-black uppercase tracking-tighter rounded-lg transition-all",
                                    i18n.language === 'en' ? "bg-white text-primary-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                English
                            </button>
                            <button 
                                onClick={() => changeLanguage('hi')}
                                className={cn(
                                    "px-4 py-1.5 text-xs font-black uppercase tracking-tighter rounded-lg transition-all",
                                    i18n.language === 'hi' ? "bg-white text-primary-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                हिंदी
                            </button>
                        </div>
                        
                        {user ? (
                            <button onClick={() => navigate('/dashboard')} className="btn-primary flex items-center gap-2 py-2 px-6">
                                {t('dashboard.title')} <ChevronRight size={18} />
                            </button>
                        ) : (
                            <div className="flex items-center gap-3">
                                <button onClick={() => navigate('/login')} className="text-slate-600 font-bold hover:text-primary-600 px-4">
                                    {t('common.login')}
                                </button>
                                <button onClick={() => navigate('/register')} className="btn-primary py-2 px-6">
                                    {t('common.register')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="pt-40 pb-24 px-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-50 rounded-full blur-[120px] -z-10 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-50 rounded-full blur-[100px] -z-10 opacity-70"></div>
                
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-xs font-black uppercase tracking-widest mb-8 animate-bounce">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        Trusted by 100+ Businesses
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[1.05] mb-8">
                        {t('landing.hero_title')}
                    </h1>
                    <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto mb-12">
                        {t('landing.hero_subtitle')}
                    </p>
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                        <button onClick={() => navigate(user ? '/dashboard' : '/register')} className="btn-primary py-4 px-10 text-lg shadow-xl shadow-primary-200 group">
                            {user ? t('dashboard.title') : t('common.get_started')}
                            <ChevronRight className="inline-block ml-2 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button 
                            onClick={() => changeLanguage(i18n.language === 'en' ? 'hi' : 'en')}
                            className="flex items-center gap-3 py-4 px-8 text-slate-700 font-bold hover:bg-slate-100 rounded-2xl transition-all"
                        >
                            <Globe size={20} className="text-primary-600" />
                            {t('landing.choose_lang')}
                        </button>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-24 px-6 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {features.map((feature, idx) => (
                        <div key={idx} className="card p-8 group hover:scale-[1.03] transition-all cursor-default">
                            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform", feature.bg)}>
                                <feature.icon className={cn("w-7 h-7", feature.color)} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-4">{feature.title}</h3>
                            <p className="text-slate-500 leading-relaxed font-medium">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Mobile Lang Picker */}
            <div className="md:hidden fixed bottom-6 right-6 z-50">
                <div className="flex flex-col gap-2 p-1 bg-white border border-slate-200 rounded-2xl shadow-2xl">
                    <button 
                        onClick={() => changeLanguage('en')}
                        className={cn(
                            "px-4 py-2 text-xs font-black uppercase rounded-xl transition-all",
                            i18n.language === 'en' ? "bg-primary-600 text-white" : "text-slate-400"
                        )}
                    >
                        EN
                    </button>
                    <button 
                        onClick={() => changeLanguage('hi')}
                        className={cn(
                            "px-4 py-2 text-xs font-black uppercase rounded-xl transition-all",
                            i18n.language === 'hi' ? "bg-primary-600 text-white" : "text-slate-400"
                        )}
                    >
                        हिं
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Landing;
