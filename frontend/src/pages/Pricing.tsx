import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Check,
  Zap,
  Crown,
  Building2,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";

const Pricing = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const res = await axios.get("/api/subscription/current");
        setCurrentPlan(res.data.planType);
      } catch (error) {
        console.error("Error fetching subscription", error);
      }
    };
    fetchSubscription();
  }, []);

  const handleUpgrade = async (planType: string) => {
    if (planType === currentPlan) return;
    if (planType === "enterprise") {
      window.location.href = `mailto:support@businessmate.com?subject=Enterprise Plan Inquiry - ${user?.companyName}`;
      return;
    }

    setLoading(true);
    try {
      const res = await axios.patch("/api/subscription/upgrade", { planType });
      showToast(res.data.message, "success");
      setCurrentPlan(planType);

      // Update auth context so the menu reflects the new status if needed
      if (user) {
        setUser({ ...user, planType: planType as any });
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || "Upgrade failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      id: "free",
      name: "Starter",
      price: "₹0",
      period: "/mo",
      description: "Perfect for small shops and individuals starting out.",
      features: [
        "Up to 3 Staff Members",
        "Basic Inventory Tracking",
        "Sales & Purchase Logs",
        "Mobile Responsive UI",
        "WhatsApp Reminders (Limited)",
      ],
      icon: <Zap className="text-amber-500" size={24} />,
      buttonText: "Current Plan",
      premium: false,
    },
    {
      id: "business",
      name: "Professional",
      price: "₹999",
      period: "/mo",
      description: "Advanced features for growing factories and retail chains.",
      features: [
        "Unlimited Staff Members",
        "Advanced Inventory (Categories)",
        "GST & Tax Invoicing",
        "Detailed Financial Ledgers",
        "Priority Email Support",
        "Custom Branding on Invoices",
      ],
      icon: <Crown className="text-primary-600" size={24} />,
      buttonText: "Upgrade Now",
      premium: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "Custom",
      period: "",
      description:
        "Custom solutions for large industries and multi-branch setups.",
      features: [
        "Multi-branch Management",
        "API Access for Integrations",
        "Dedicated Account Manager",
        "Custom Feature Development",
        "On-premise Deployment Option",
        "SLA Guarantee",
      ],
      icon: <Building2 className="text-emerald-600" size={24} />,
      buttonText: "Contact Sales",
      premium: false,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase">
          Pick Your Power
        </h1>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-sm opacity-60">
          Scale BusinessMate as your business grows
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-20">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative group card p-8 bg-white rounded-[3rem] shadow-2xl transition-all duration-500 hover:-translate-y-2 flex flex-col ${
              plan.premium
                ? "border-2 border-primary-500 shadow-primary-100 ring-4 ring-primary-50"
                : "border-none shadow-slate-200"
            }`}
          >
            {plan.premium && (
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full shadow-lg">
                Most Popular
              </div>
            )}

            <div className="space-y-6 flex-grow">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                {plan.icon}
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-black text-slate-900">
                    {plan.price}
                  </span>
                  <span className="text-slate-400 font-bold text-sm tracking-widest uppercase">
                    {plan.period}
                  </span>
                </div>
                <p className="text-slate-500 text-sm font-medium mt-4 leading-relaxed">
                  {plan.description}
                </p>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-50">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Check size={12} strokeWidth={4} />
                    </div>
                    <span className="text-sm font-bold text-slate-600 leading-tight">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleUpgrade(plan.id)}
              disabled={loading || currentPlan === plan.id}
              className={`w-full mt-10 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                currentPlan === plan.id
                  ? "bg-slate-100 text-slate-400 cursor-default"
                  : plan.premium
                    ? "bg-primary-600 text-white shadow-xl shadow-primary-200 hover:bg-primary-700"
                    : "bg-slate-900 text-white hover:bg-black shadow-xl shadow-slate-200"
              }`}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  {currentPlan === plan.id ? "Active Plan" : plan.buttonText}
                  {currentPlan !== plan.id && <ArrowRight size={18} />}
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 rounded-[3rem] p-12 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-12 text-white/5 opacity-20 pointer-events-none">
          <Zap size={200} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl space-y-4">
            <h2 className="text-3xl font-black text-white tracking-tight uppercase">
              Need something custom?
            </h2>
            <p className="text-slate-400 font-bold">
              We build custom features for specialized industries. If your
              workflow is unique, our business experts can help.
            </p>
          </div>
          <a
            href="https://wa.me/917061338807?text=Hello%20Expert%2C%20I%20need%20some%20help%20with%20BusinessMate%20ERP."
            target="_blank"
            rel="noopener noreferrer"
            className="px-10 py-5 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-slate-100 transition-all flex items-center gap-3"
          >
            Speak with Experts <ArrowRight size={18} />
          </a>
        </div>
      </div>
    </div>
  );
};

export { Pricing };
export default Pricing;
