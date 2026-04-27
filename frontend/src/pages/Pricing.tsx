import React, { useState } from 'react';
import { Check, Zap, Building2, Crown, ArrowRight, Loader2, ShieldCheck, CreditCard, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate, Link } from 'react-router-dom';

declare global {
    interface Window {
        Razorpay: any;
    }
}

const PLANS = [
    {
        id: 'free',
        name: 'Free Starter',
        prices: {
            monthly: 0,
            yearly: 0
        },
        amounts: {
            monthly: 0,
            yearly: 0
        },
        description: 'Perfect for micro-shops getting started.',
        icon: <Zap className="text-slate-400" />,
        features: [
            '50 Bills per Month',
            'Up to 100 Products',
            'WhatsApp Sharing',
            'Single User Only',
            'AI Assistant (5 Trial Questions)'
        ]
    },
    {
        id: 'basic',
        name: 'Basic Plan',
        prices: {
            monthly: 179,
            yearly: 139
        },
        amounts: {
            monthly: 179,
            yearly: 1668
        },
        description: 'Unlimited growth for single owners.',
        icon: <Zap className="text-primary-500" />,
        features: [
            'Unlimited Bills & Products',
            'WhatsApp & Printing',
            'Basic GST Reports',
            'Single User Only',
            'Email Receipts',
            'AI Assistant (5 Trial Questions)'
        ]
    },
    {
        id: 'business',
        name: 'Business Pro',
        prices: {
            monthly: 399,
            yearly: 299
        },
        amounts: {
            monthly: 399,
            yearly: 3588
        },
        description: 'Everything for managing your team.',
        icon: <Crown className="text-amber-500" />,
        popular: true,
        features: [
            'Everything in Basic',
            'Bulk Inventory Upload',
            'Staff Management (5 Staff)',
            'Advanced Analytics',
            'Expense Tracking',
            'Unlimited AI Assistant',
            'Priority Support'
        ]
    }
];

const Pricing = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [isYearly, setIsYearly] = useState(true);
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleSubscription = async (plan: any) => {
        if (!user) {
            showToast('Please register or login to subscribe.', 'info');
            navigate('/register');
            return;
        }

        if (plan.id === 'free') {
            showToast('You are on the Free Starter plan.', 'info');
            navigate('/dashboard');
            return;
        }

        setLoadingPlan(plan.id);
        const res = await loadRazorpayScript();

        if (!res) {
            showToast('Razorpay SDK failed to load. Are you online?', 'error');
            setLoadingPlan(null);
            return;
        }

        try {
            // Create order on backend
            const amount = isYearly ? plan.amounts.yearly : plan.amounts.monthly;
            const { data: order } = await axios.post('/api/subscription/order', {
                planType: plan.id,
                amount: amount,
                billingCycle: isYearly ? 'yearly' : 'monthly'
            }, { headers: { Authorization: `Bearer ${user?.token}` } });

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_your_key',
                amount: order.amount,
                currency: order.currency,
                name: 'BuildMate ERP',
                description: isYearly 
                    ? `${plan.name} - Annual Membership (₹${plan.prices.yearly}/mo x 12)` 
                    : `${plan.name} - Monthly Subscription (₹${plan.prices.monthly}/mo)`,
                image: '/logo.png',
                order_id: order.id,
                handler: async (response: any) => {
                    try {
                        const verifyData = {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            planType: plan.id,
                            billingCycle: isYearly ? 'yearly' : 'monthly'
                        };

                        await axios.post('/api/subscription/verify', verifyData, {
                            headers: { Authorization: `Bearer ${user?.token}` }
                        });

                        showToast('Subscription activated!', 'success');
                        window.location.href = '/success';
                    } catch (err: any) {
                        showToast(err.response?.data?.message || 'Verification failed', 'error');
                    }
                },
                prefill: {
                    name: user?.name,
                    email: user?.email,
                    contact: '',
                },
                notes: {
                    address: 'BuildMate Headquarters',
                },
                theme: {
                    color: '#4f46e5',
                },
            };

            const paymentObject = new window.Razorpay(options);
            paymentObject.open();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Error creating order', 'error');
        } finally {
            setLoadingPlan(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-20 px-4">
            <div className="max-w-6xl mx-auto mb-8">
                <button 
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-colors"
                >
                    <ArrowLeft size={20} /> Back
                </button>
            </div>
            <div className="max-w-6xl mx-auto text-center mb-16">
                <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter mb-4">
                    Upgrade to <span className="text-primary-600">Growth</span>
                </h1>
                <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto">
                    Choose the plan that fits your business size. Manage inventory, sales, and staff like a pro.
                </p>

                {/* Billing Cycle Toggle */}
                <div className="mt-10 flex flex-col items-center gap-6">
                    <div className="flex items-center justify-center gap-4">
                        <span className={`text-sm font-bold ${!isYearly ? 'text-slate-900' : 'text-slate-400'}`}>Monthly</span>
                        <button 
                            onClick={() => setIsYearly(!isYearly)}
                            className="relative w-16 h-8 bg-slate-900 rounded-full p-1 transition-all duration-300"
                        >
                            <div className={`w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 transform ${isYearly ? 'translate-x-8' : 'translate-x-0'}`} />
                        </button>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${isYearly ? 'text-slate-900' : 'text-slate-400'}`}>Yearly</span>
                            <span className="bg-emerald-100 text-emerald-600 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider">
                                Save ~30%
                            </span>
                        </div>
                    </div>

                    {/* Dynamic Order Summary */}
                    <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl px-8 py-4 shadow-sm flex items-center gap-8 group animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center">
                                <CreditCard size={20} />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Payment Detail</p>
                                <p className="text-sm font-bold text-slate-700">
                                    {isYearly ? 'Annual Membership' : 'Monthly Subscription'}
                                </p>
                            </div>
                        </div>
                        <div className="h-10 w-px bg-slate-200" />
                        <div className="text-left">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Total Billable</p>
                            <p className="text-sm font-black text-primary-600">
                                {isYearly ? '₹1,668 (Basic) / ₹3,588 (Pro)' : '₹179 (Basic) / ₹399 (Pro)'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {PLANS.map((plan) => (
                    <div 
                        key={plan.id}
                        className={`relative bg-white rounded-[3rem] p-10 shadow-xl border-2 transition-all duration-300 hover:scale-[1.02] ${plan.popular ? 'border-primary-500 shadow-primary-100' : 'border-slate-100'}`}
                    >
                        {plan.popular && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary-600 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-lg">
                                Most Popular
                            </div>
                        )}
                        
                        <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                            {plan.icon}
                        </div>

                        <h3 className="text-2xl font-black text-slate-800 mb-2">{plan.name}</h3>
                        <p className="text-slate-400 text-sm font-medium mb-8 h-10">{plan.description}</p>
                        
                        <div className="mb-8">
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black text-slate-800 tracking-tighter">
                                    ₹{isYearly ? plan.prices.yearly : plan.prices.monthly}
                                </span>
                                <span className="text-slate-400 font-bold">/mo</span>
                            </div>
                            {plan.prices.yearly > 0 && (
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                                    {isYearly 
                                        ? `Billed annually (₹${plan.amounts.yearly})` 
                                        : `Billed monthly (₹${plan.amounts.monthly})`
                                    }
                                </p>
                            )}
                        </div>

                        <ul className="space-y-4 mb-10 text-left">
                            {plan.features.map((feature, i) => (
                                <li key={i} className="flex items-center gap-3 text-sm font-bold text-slate-600">
                                    <div className="w-5 h-5 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                                        <Check size={12} />
                                    </div>
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        <button 
                            onClick={() => handleSubscription(plan)}
                            disabled={!!loadingPlan}
                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all ${plan.popular ? 'bg-primary-600 text-white shadow-xl shadow-primary-200 hover:bg-primary-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                        >
                            {loadingPlan === plan.id ? <Loader2 size={18} className="animate-spin" /> : <><CreditCard size={18}/> Get Started</>}
                        </button>
                    </div>
                ))}
            </div>

            <div className="max-w-4xl mx-auto mt-20 p-8 bg-white/50 rounded-[2.5rem] border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-8 backdrop-blur-sm">
                <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                        <ShieldCheck size={30} />
                    </div>
                    <div>
                        <h4 className="font-black text-slate-800 tracking-tight">Secure Payment Guarantee</h4>
                        <p className="text-slate-500 text-sm font-medium">Your payments are processed by Razorpay with 256-bit encryption.</p>
                    </div>
                </div>
                <div className="flex gap-4 grayscale opacity-50">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-6" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg" alt="Visa" className="h-6" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6" />
                </div>
            </div>

            <footer className="max-w-4xl mx-auto mt-12 mb-10 text-center">
                <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    <Link to="/contact" className="hover:text-primary-600 transition-colors">Contact Us</Link>
                    <span className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                    <Link to="/privacy" className="hover:text-primary-600 transition-colors">Privacy Policy</Link>
                    <span className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                    <Link to="/terms" className="hover:text-primary-600 transition-colors">Terms of Service</Link>
                </div>
                <p className="mt-6 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    &copy; {new Date().getFullYear()} BuildMate ERP. All rights reserved.
                </p>
            </footer>
        </div>
    );
};

export default Pricing;
