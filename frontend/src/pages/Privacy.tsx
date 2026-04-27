import React from 'react';
import { Shield, Lock, Eye, FileText, Globe, Bell, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Privacy = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 py-20 px-4">
            <div className="max-w-4xl mx-auto mb-8">
                <button 
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-colors"
                >
                    <ArrowLeft size={20} /> Back
                </button>
            </div>
            <div className="max-w-4xl mx-auto bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl border border-slate-100">
                <div className="flex items-center gap-4 mb-12">
                    <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center shadow-inner">
                        <Shield size={32} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Privacy Policy</h1>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Last Updated: April 2026</p>
                    </div>
                </div>

                <div className="prose prose-slate max-w-none space-y-12">
                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-slate-900 mb-4">
                            <Eye size={24} className="text-primary-600" />
                            <h2 className="text-2xl font-black tracking-tight">Data We Collect</h2>
                        </div>
                        <p className="text-slate-600 font-medium leading-relaxed">
                            At BuildMate ERP, we collect information essential for your business operations. This includes your name, business name, contact details, and transaction data you input into the system. We do not sell your personal or business data to third parties.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-slate-900 mb-4">
                            <Lock size={24} className="text-emerald-600" />
                            <h2 className="text-2xl font-black tracking-tight">How We Secure Your Data</h2>
                        </div>
                        <p className="text-slate-600 font-medium leading-relaxed">
                            Your data is stored in secure, encrypted databases. We use 256-bit SSL encryption for all data transmissions. Payments are handled separately by Razorpay, a PCI-DSS compliant payment gateway, ensuring your financial information is never stored on our servers.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-slate-900 mb-4">
                            <Globe size={24} className="text-amber-600" />
                            <h2 className="text-2xl font-black tracking-tight">Cookie Policy</h2>
                        </div>
                        <p className="text-slate-600 font-medium leading-relaxed">
                            We use essential cookies to maintain your session and preferences. These cookies help us understand how you interact with our platform and provide a seamless experience. You can disable cookies in your browser settings, though some features may not function correctly.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-slate-900 mb-4">
                            <Bell size={24} className="text-primary-600" />
                            <h2 className="text-2xl font-black tracking-tight">Changes to Policy</h2>
                        </div>
                        <p className="text-slate-600 font-medium leading-relaxed">
                            We may update this policy periodically to reflect changes in our services or legal requirements. We will notify you of any significant changes via the email address associated with your account.
                        </p>
                    </section>

                    <div className="mt-16 p-8 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                        <div>
                            <h4 className="font-black text-slate-800">Questions about your privacy?</h4>
                            <p className="text-slate-500 text-sm font-medium">Contact our Data Protection Officer</p>
                        </div>
                        <button onClick={() => navigate('/contact')} className="px-6 py-3 bg-white text-slate-900 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-sm hover:shadow-md transition-all">
                            Contact Us
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Privacy;
