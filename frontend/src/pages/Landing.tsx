import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Receipt, Users, ChevronRight, Globe, Package, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import SEO from '../components/SEO';

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const Landing = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t, i18n } = useTranslation();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

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
            <nav className={cn(
                "fixed top-0 w-full z-50 transition-all duration-300 border-b",
                isMenuOpen ? "bg-white h-full md:h-20" : "bg-slate-50/80 backdrop-blur-xl border-slate-200/50 h-20"
            )}>
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between text-slate-900">
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate('/')}>
                        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-200 group-hover:rotate-12 transition-transform">
                            <Package size={24} />
                        </div>
                        <span className="text-2xl font-black tracking-tighter">BuildMate<span className="text-primary-600">ERP</span></span>
                    </div>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-8">
                        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
                            <button 
                                onClick={() => changeLanguage('en')}
                                className={cn(
                                    "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                                    i18n.language === 'en' ? "bg-white text-primary-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                English
                            </button>
                            <button 
                                onClick={() => changeLanguage('hi')}
                                className={cn(
                                    "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
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
                            <div className="flex items-center gap-4">
                                <button onClick={() => navigate('/login')} className="text-slate-600 font-bold hover:text-primary-600 transition-colors">
                                    {t('common.login')}
                                </button>
                                <button onClick={() => navigate('/register')} className="btn-primary py-2 px-8">
                                    {t('common.register')}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button 
                        className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
                    </button>
                </div>

                {/* Mobile Menu Content */}
                {isMenuOpen && (
                    <div className="md:hidden flex flex-col p-6 gap-8 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2">{t('landing.choose_lang')}</p>
                            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-50 rounded-2xl">
                                <button 
                                    onClick={() => { changeLanguage('en'); setIsMenuOpen(false); }}
                                    className={cn(
                                        "py-3 rounded-xl font-bold transition-all",
                                        i18n.language === 'en' ? "bg-white text-primary-600 shadow-sm" : "text-slate-400"
                                    )}
                                >
                                    English
                                </button>
                                <button 
                                    onClick={() => { changeLanguage('hi'); setIsMenuOpen(false); }}
                                    className={cn(
                                        "py-3 rounded-xl font-bold transition-all",
                                        i18n.language === 'hi' ? "bg-white text-primary-600 shadow-sm" : "text-slate-400"
                                    )}
                                >
                                    हिंदी
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            {user ? (
                                <button 
                                    onClick={() => { navigate('/dashboard'); setIsMenuOpen(false); }} 
                                    className="btn-primary w-full py-4 text-center"
                                >
                                    {t('dashboard.title')}
                                </button>
                            ) : (
                                <>
                                    <button 
                                        onClick={() => { navigate('/register'); setIsMenuOpen(false); }} 
                                        className="btn-primary w-full py-4 text-center"
                                    >
                                        {t('common.register')}
                                    </button>
                                    <button 
                                        onClick={() => { navigate('/login'); setIsMenuOpen(false); }} 
                                        className="btn-secondary w-full py-4 text-center"
                                    >
                                        {t('common.login')}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero */}
            <section className="pt-40 pb-24 px-6 relative overflow-hidden">
                {/* Premium Background Elements */}
                <div className="absolute top-0 right-[-10%] w-[600px] h-[600px] bg-primary-100/30 rounded-full blur-[120px] -z-10 animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-100/20 rounded-full blur-[100px] -z-10 animate-float"></div>
                <div className="absolute top-[20%] left-[5%] w-24 h-24 bg-primary-200/20 rounded-3xl rotate-12 blur-2xl -z-10"></div>
                
                <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
                    <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white border border-slate-200/50 shadow-sm text-slate-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        {t('landing.trusted_by', 'Trusted by 100+ Businesses')}
                    </div>
                    
                    <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-[-0.04em] leading-[0.95] mb-10 max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
                        {t('landing.hero_title')}
                    </h1>
                    
                    <p className="text-xl md:text-2xl text-slate-500 font-medium leading-relaxed max-w-2xl mb-14 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                        {t('landing.hero_subtitle')}
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
                        <button 
                            onClick={() => navigate(user ? '/dashboard' : '/register')} 
                            className="btn-primary w-full sm:w-auto py-5 px-12 text-lg shadow-2xl shadow-primary-200 group"
                        >
                            {user ? t('dashboard.title') : t('common.get_started')}
                            <ChevronRight className="inline-block ml-2 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button 
                            onClick={() => changeLanguage(i18n.language === 'en' ? 'hi' : 'en')}
                            className="btn-secondary w-full sm:w-auto py-5 px-10 text-lg flex items-center justify-center gap-3"
                        >
                            <Globe size={22} className="text-primary-600" />
                            {i18n.language === 'en' ? 'हिंदी में' : 'English'}
                        </button>
                    </div>

                    <div className="mt-20"></div>
                </div>
            </section>

            {/* Features */}
            <section id="features" className="py-32 px-6 max-w-7xl mx-auto relative">
                <div className="text-center mb-20">
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">Everything you need to scale</h2>
                    <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto">BuildMate ERP provides a comprehensive suite of tools designed specifically for modern business operations.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    {features.map((feature, idx) => (
                        <div key={idx} className="card group hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary-100/50 transition-all duration-500 cursor-default border border-slate-100">
                            <div className={cn("w-16 h-16 rounded-[2rem] flex items-center justify-center mb-8 group-hover:rotate-[10deg] transition-transform duration-500", feature.bg)}>
                                <feature.icon className={cn("w-8 h-8", feature.color)} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">{feature.title}</h3>
                            <p className="text-slate-500 leading-relaxed font-medium text-lg">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Stats / Proof */}
            <section className="py-24 bg-slate-100/50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
                        <div>
                            <div className="text-4xl md:text-5xl font-black text-primary-600 mb-2">10k+</div>
                            <div className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Active Users</div>
                        </div>
                        <div>
                            <div className="text-4xl md:text-5xl font-black text-primary-600 mb-2">99%</div>
                            <div className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Uptime Rate</div>
                        </div>
                        <div>
                            <div className="text-4xl md:text-5xl font-black text-primary-600 mb-2">24/7</div>
                            <div className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Support</div>
                        </div>
                        <div>
                            <div className="text-4xl md:text-5xl font-black text-primary-600 mb-2">100+</div>
                            <div className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Reviews</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-32 px-6">
                <div className="max-w-5xl mx-auto card bg-slate-900 border-none p-16 text-center relative overflow-hidden">
                    <div className="absolute top-[-20%] right-[-10%] w-[300px] h-[300px] bg-primary-600/20 rounded-full blur-[80px]"></div>
                    <div className="relative z-10">
                        <h2 className="text-4xl md:text-5xl font-black text-white mb-8 tracking-tight">Ready to transform your business?</h2>
                        <p className="text-slate-400 text-lg font-medium mb-12 max-w-xl mx-auto">Join hundreds of successful businesses who trust BuildMate ERP for their daily operations.</p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <button onClick={() => navigate('/register')} className="btn-primary py-5 px-12 text-lg shadow-2xl shadow-primary-900/50 w-full sm:w-auto">
                                Get Started Free
                            </button>
                            <button onClick={() => navigate('/login')} className="bg-white/10 hover:bg-white/20 text-white font-bold py-5 px-12 rounded-[1.25rem] transition-all w-full sm:w-auto">
                                Sign In
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-slate-200 text-center">
                <p className="text-slate-400 text-sm font-medium">&copy; {new Date().getFullYear()} BuildMate ERP. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default Landing;
