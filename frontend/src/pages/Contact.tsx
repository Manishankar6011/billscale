import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, ShieldCheck } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import axios from 'axios';

const Contact = () => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: 'Account & Subscription',
        message: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            await axios.post('/api/support/contact', formData);
            showToast('Message sent! Our team will contact you soon.', 'success');
            setFormData({ name: '', email: '', subject: 'Account & Subscription', message: '' });
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to send message', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-20 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                    {/* Left Side: Info */}
                    <div className="space-y-12">
                        <div>
                            <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-4">
                                Get in <span className="text-primary-600">Touch</span>
                            </h1>
                            <p className="text-slate-500 text-lg font-medium leading-relaxed">
                                Have questions about our ERP or need a custom solution for your business? 
                                We're here to help you scale.
                            </p>
                        </div>

                        <div className="space-y-8">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg text-primary-600">
                                    <Mail size={28} />
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-800 tracking-tight">Email Us</h4>
                                    <p className="text-slate-500 font-bold">manishankar6011@gmail.com</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg text-emerald-600">
                                    <Phone size={28} />
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-800 tracking-tight">Call Support</h4>
                                    <p className="text-slate-500 font-bold">+91 7061338807</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg text-amber-600">
                                    <MapPin size={28} />
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-800 tracking-tight">Our Office</h4>
                                    <p className="text-slate-500 font-bold">Malikana, panthpakar, sitamarhi, bihar, India</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-primary-600 rounded-[2.5rem] text-white shadow-2xl shadow-primary-200">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-2 bg-white/20 rounded-lg">
                                    <ShieldCheck size={24} />
                                </div>
                                <h3 className="text-xl font-black">Priority Support</h3>
                            </div>
                            <p className="text-primary-100 font-medium">
                                Business Pro members get access to 24/7 dedicated support and faster response times.
                            </p>
                        </div>
                    </div>

                    {/* Right Side: Form */}
                    <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-slate-100">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                                    <input 
                                        required
                                        type="text" 
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold text-slate-800 focus:ring-2 focus:ring-primary-500/20" 
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                                    <input 
                                        required
                                        type="email" 
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold text-slate-800 focus:ring-2 focus:ring-primary-500/20" 
                                        placeholder="john@example.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Subject</label>
                                <select 
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold text-slate-800 focus:ring-2 focus:ring-primary-500/20"
                                >
                                    <option>Account & Subscription</option>
                                    <option>Technical Issue</option>
                                    <option>Business Partnership</option>
                                    <option>Other</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Message</label>
                                <textarea 
                                    required
                                    rows={5}
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    className="w-full bg-slate-50 border-none rounded-3xl py-4 px-6 font-bold text-slate-800 focus:ring-2 focus:ring-primary-500/20" 
                                    placeholder="Tell us how we can help..."
                                />
                            </div>

                            <button 
                                disabled={loading}
                                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-[0.98]"
                            >
                                {loading ? 'Sending...' : <><Send size={20} /> Send Message</>}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Contact;
