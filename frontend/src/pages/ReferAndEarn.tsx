import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Gift, Copy, Check, Users, Sparkles, TrendingUp, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface Referral {
    _id: string;
    companyName: string;
    planType: string;
    createdAt: string;
    referralRewardClaimed: boolean;
}

const ReferAndEarn: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchReferrals = async () => {
            try {
                const { data } = await axios.get('/api/auth/referrals');
                setReferrals(data);
            } catch (err) {
                console.error('Failed to fetch referrals:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchReferrals();
    }, []);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        showToast('Referral link copied!', 'success');
        setTimeout(() => setCopied(false), 2000);
    };

    const referralLink = `${window.location.origin}/register?ref=${user?.referralCode}`;

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 to-indigo-700 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-primary-100">
                <div className="relative z-10 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-widest mb-6">
                        <Sparkles size={14} className="text-amber-300" />
                        Exclusive Invitation Program
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter mb-4 leading-none">
                        Get 1 Month <span className="text-amber-300">Free</span> for every Referral
                    </h1>
                    <p className="text-lg text-primary-50 font-medium mb-8 leading-relaxed">
                        Refer a business friend to BuildMate ERP. When they upgrade to any paid plan, we'll extend your subscription by **30 days** automatically.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 flex items-center justify-between">
                            <div className="overflow-hidden">
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary-200 mb-1">Your Unique Code</p>
                                <p className="text-2xl font-black tracking-widest">{user?.referralCode}</p>
                            </div>
                            <button 
                                onClick={() => copyToClipboard(user?.referralCode || '')}
                                className="p-3 bg-white text-primary-600 rounded-xl hover:bg-slate-50 transition-all active:scale-95 shadow-lg"
                            >
                                {copied ? <Check size={20} /> : <Copy size={20} />}
                            </button>
                        </div>
                        <button 
                            onClick={() => copyToClipboard(referralLink)}
                            className="px-8 py-4 bg-amber-400 text-amber-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-amber-300 transition-all shadow-xl shadow-amber-900/20 flex items-center gap-2 active:scale-95"
                        >
                            <Gift size={18} />
                            Share Link
                        </button>
                    </div>
                </div>
                
                {/* Abstract Background Decoration */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Stats Cards */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3 uppercase">
                        <TrendingUp className="text-primary-600" />
                        Referral History
                    </h2>
                    
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden">
                        {loading ? (
                            <div className="p-20 text-center text-slate-400">Loading your stats...</div>
                        ) : referrals.length === 0 ? (
                            <div className="p-20 text-center space-y-4">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                    <Users size={40} />
                                </div>
                                <p className="text-slate-500 font-bold tracking-tight">No referrals yet. Start sharing to earn rewards!</p>
                            </div>
                        ) : (
                            <table className="w-full border-collapse">
                                <thead className="bg-slate-50/50 border-b border-slate-100">
                                    <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <th className="px-8 py-6 text-left font-black">Business Name</th>
                                        <th className="px-6 py-6 text-left">Joined On</th>
                                        <th className="px-6 py-6 text-left">Status</th>
                                        <th className="px-8 py-6 text-right font-black">Reward</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {referrals.map((ref) => (
                                        <tr key={ref._id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-5">
                                                <p className="font-bold text-slate-700">{ref.companyName}</p>
                                                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                                                    {ref.planType === 'free' ? 'Free User' : `${ref.planType} Plan`}
                                                </p>
                                            </td>
                                            <td className="px-6 py-5 text-xs text-slate-500 font-medium">
                                                {new Date(ref.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-5">
                                                {ref.referralRewardClaimed ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                        <Check size={10} /> Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                        Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-8 py-5 text-right font-black text-xs">
                                                {ref.referralRewardClaimed ? (
                                                    <span className="text-emerald-500">+30 Days Added</span>
                                                ) : (
                                                    <span className="text-slate-300">Wait for Upgrade</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* How it Works Section */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">How it works</h2>
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-8 space-y-8">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex-shrink-0 flex items-center justify-center font-black">1</div>
                            <div>
                                <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-1">Share Code</h3>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">Send your link or unique referral code to other business owners you know.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex-shrink-0 flex items-center justify-center font-black">2</div>
                            <div>
                                <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-1">They Upgrade</h3>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">Once they signup and upgrade to any paid plan (Basic or Pro), the reward triggers.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex-shrink-0 flex items-center justify-center font-black">3</div>
                            <div>
                                <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-1">Get 30 Days Free</h3>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">We'll instantly add 30 days to your current subscription. No limits on referrals!</p>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-50 mt-4">
                            <div className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <Calendar className="text-primary-600" size={18} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pro Tip</span>
                                </div>
                                <p className="text-xs text-slate-600 font-medium leading-relaxed italic">
                                    "Refer 12 businesses who upgrade, and you essentially get the entire year of BuildMate ERP for free!"
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReferAndEarn;
