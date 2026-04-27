import React from 'react';
import { FileText, ClipboardList, Scale, AlertCircle, RefreshCcw, Handshake, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Terms = () => {
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
                    <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner">
                        <FileText size={32} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Terms of Service</h1>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Effective Date: April 2026</p>
                    </div>
                </div>

                <div className="prose prose-slate max-w-none space-y-12">
                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-slate-900 mb-4">
                            <Handshake size={24} className="text-amber-600" />
                            <h2 className="text-2xl font-black tracking-tight">1. Acceptance of Terms</h2>
                        </div>
                        <p className="text-slate-600 font-medium leading-relaxed">
                            By accessing or using BuildMate ERP, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-slate-900 mb-4">
                            <ClipboardList size={24} className="text-primary-600" />
                            <h2 className="text-2xl font-black tracking-tight">2. Subscription & Payments</h2>
                        </div>
                        <p className="text-slate-600 font-medium leading-relaxed">
                            Fees for our services are billed based on the plan you select (Free, Basic, Business). Payments are non-refundable. You are responsible for ensuring your subscription is active to maintain access to features like Bulk Upload and AI Assistant.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-slate-900 mb-4">
                            <RefreshCcw size={24} className="text-emerald-600" />
                            <h2 className="text-2xl font-black tracking-tight">3. Renewals & Cancellations</h2>
                        </div>
                        <p className="text-slate-600 font-medium leading-relaxed">
                            Subscriptions automatically expire at the end of the billing period unless renewed. You can cancel your service at any time, but no refunds will be issued for the remaining period of the subscription.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-slate-900 mb-4">
                            <Scale size={24} className="text-primary-600" />
                            <h2 className="text-2xl font-black tracking-tight">4. Limitation of Liability</h2>
                        </div>
                        <p className="text-slate-600 font-medium leading-relaxed">
                            BuildMate ERP is provided "as is". While we strive for 100% uptime and accuracy, we are not liable for any data loss, business interruption, or financial loss resulting from the use or inability to use our platform.
                        </p>
                    </section>

                    <div className="mt-16 p-8 bg-amber-50 rounded-3xl border border-amber-100 flex items-start gap-4">
                        <AlertCircle className="text-amber-600 shrink-0 mt-1" size={24} />
                        <div>
                            <h4 className="font-black text-amber-900 leading-none mb-2">Important Note</h4>
                            <p className="text-amber-800 text-sm font-medium">
                                Using BuildMate ERP for any illegal activities or data fraud will result in immediate termination of your account without notice.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Terms;
