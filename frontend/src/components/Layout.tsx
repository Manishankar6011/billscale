import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Box,
  ShoppingCart,
  Receipt,
  Users,
  CalendarCheck,
  Wallet,
  FileText,
  Settings,
  LogOut,
  UserRound,
  Gift,
  Plus,
  Bug,
  Lightbulb,
  MessageSquare,
  ShieldCheck,
  BarChart3,
  PackageSearch,
  Keyboard,
  X
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";
import AIAssistant from "./AIAssistant";

import { canUseFeature, type PlanType } from "../utils/planLimits";

const Layout = () => {
  const { logout, user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const isExpired = user?.subscriptionStatus === 'inactive';
  const isTrial = user?.subscriptionStatus === 'trial';
  const daysLeft = user?.subscriptionExpiryDate 
    ? Math.ceil((new Date(user.subscriptionExpiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) 
    : 0;
  const isAboutToExpire = daysLeft >= 0 && daysLeft <= 7;

  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt (or Option on Mac) shortcuts
      if (e.altKey) {
        switch (e.code) {
          case 'KeyS':
            e.preventDefault();
            navigate("/dashboard/sales", { state: { openModal: true } });
            break;
          case 'KeyP':
            e.preventDefault();
            navigate("/dashboard/purchases", { state: { openModal: true } });
            break;
          case 'KeyI':
            e.preventDefault();
            navigate("/dashboard/inventory");
            break;
          case 'KeyC':
            e.preventDefault();
            navigate("/dashboard/customers");
            break;
          case 'KeyD':
            e.preventDefault();
            navigate("/dashboard");
            break;
          case 'KeyR':
            e.preventDefault();
            navigate("/dashboard/reports");
            break;
          case 'KeyK':
            e.preventDefault();
            setShowShortcuts(prev => !prev);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const isContractor = user?.businessType === 'Contractor';

  const navItems = [
    { name: t("common.dashboard"), path: "/dashboard", icon: LayoutDashboard },
    // These items are hidden for Contractors (Thekedar)
    { name: t("common.inventory"), path: "/dashboard/inventory", icon: Box, hideForContractor: true },
    {
      name: t("common.purchases"),
      path: "/dashboard/purchases",
      icon: ShoppingCart,
      hideForContractor: true,
    },
    { name: t("common.sales"), path: "/dashboard/sales", icon: Receipt, hideForContractor: true },
    { name: "Customers", path: "/dashboard/customers", icon: UserRound, hideForContractor: true },
    // Staff-related — primary for Contractors
    { name: isContractor ? "Workers (श्रमिक)" : t("common.staff"), path: "/dashboard/staff", icon: Users, ownerOnly: true },
    {
      name: isContractor ? "Attendance (हाजिरी)" : t("common.attendance"),
      path: "/dashboard/attendance",
      icon: CalendarCheck,
      ownerOnly: true
    },
    { name: isContractor ? "Salary & Khata (वेतन / हिसाब)" : t("common.salary"), path: "/dashboard/salary", icon: Wallet, ownerOnly: true },
    { name: t("common.ledger"), path: "/dashboard/ledger", icon: FileText, ownerOnly: true },
    { name: "Reports", path: "/dashboard/reports", icon: BarChart3, ownerOnly: true, hideForContractor: true },
    { name: "Product Sales", path: "/dashboard/item-sales", icon: PackageSearch, ownerOnly: true, hideForContractor: true },
    { 
      name: "GST Reports", 
      path: "/dashboard/gst-reports", 
      icon: ShieldCheck, 
      ownerOnly: true,
      planRestricted: 'hasGSTReports',
      hideForContractor: true,
    },
    { name: t("common.settings"), path: "/dashboard/settings", icon: Settings, ownerOnly: true },
    { name: "Refer & Earn", path: "/dashboard/referral", icon: Gift },
  ].filter(item => {
    const isOwner = (user?.role === 'owner' || user?.role === 'accountant' || user?.role === 'super-admin');
    if (item.ownerOnly && !isOwner) return false;
    if (item.hideForContractor && isContractor) return false;
    
    if (item.planRestricted) {
      return canUseFeature((user?.planType as PlanType) || 'free', item.planRestricted as any);
    }
    
    return true;
  });


  if (!user) return null;

  return (
    <div className="flex flex-col min-h-screen lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-100 p-6 fixed h-full overflow-y-auto print:hidden z-40">
        <div 
          className="mb-10 flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate("/")}
        >
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:rotate-12 transition-transform">
            <span className="text-xl font-bold italic">B</span>
          </div>
          <span className="text-xl font-bold text-slate-800">
            BuildMate ERP
          </span>
        </div>

        <button
          onClick={() => navigate("/dashboard/sales", { state: { openModal: true } })}
          className="w-full mb-6 py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all flex items-center justify-center gap-2 group shrink-0"
        >
          <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
          Create Sales Invoice
        </button>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/dashboard"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary-50 text-primary-600"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                )
              }
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="px-4 mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Help & Support</p>
          <div className="space-y-1">
            <button 
              onClick={() => setShowShortcuts(true)}
              className="flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
            >
              <Keyboard className="w-4 h-4" />
              Keyboard Shortcuts
            </button>
            <NavLink to="/dashboard/contact" className={({ isActive }) => cn("flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all", isActive ? "bg-primary-50 text-primary-600" : "text-slate-500 hover:bg-slate-50")}>
              <MessageSquare className="w-4 h-4" />
              Contact Us
            </NavLink>
            <NavLink to="/dashboard/contact?subject=Report%20a%20Bug" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all">
              <Bug className="w-4 h-4" />
              Report Bug
            </NavLink>
            <NavLink to="/dashboard/contact?subject=Request%20a%20Feature" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-all">
              <Lightbulb className="w-4 h-4" />
              Request Feature
            </NavLink>
            <NavLink to="/dashboard/privacy" className={({ isActive }) => cn("flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all", isActive ? "bg-primary-50 text-primary-600" : "text-slate-500 hover:bg-slate-50")}>
              <ShieldCheck className="w-4 h-4" />
              Privacy Policy
            </NavLink>
            <NavLink to="/dashboard/terms" className={({ isActive }) => cn("flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all", isActive ? "bg-primary-50 text-primary-600" : "text-slate-500 hover:bg-slate-50")}>
              <FileText className="w-4 h-4" />
              Terms of Service
            </NavLink>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-4 px-2">
            {user.logoUrl ? (
                <img src={user.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-slate-50 border border-slate-100" />
            ) : (
                <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center font-black text-xs">
                    {user.companyName?.charAt(0) || user.name.charAt(0)}
                </div>
            )}
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {user.name}
              </p>
              {user.referralCode && (
                <p className="text-[10px] font-bold text-slate-400 -mt-0.5 mb-1 flex items-center gap-1">
                  <span className="uppercase tracking-tighter">Code:</span>
                  <span className="text-primary-600 tracking-widest">{user.referralCode}</span>
                </p>
              )}
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest ${
                  user.planType === 'business' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 
                  user.planType === 'basic' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 
                  'bg-slate-100 text-slate-500'
                }`}>
                  {user.planType === 'business' ? 'Business Pro' : 
                   user.planType === 'basic' ? 'Basic Plan' : 'Free Starter'}
                </span>
                <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest ${
                  user.subscriptionStatus === 'active' ? 'bg-emerald-50 text-emerald-600' : 
                  user.subscriptionStatus === 'trial' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {user.subscriptionStatus}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-3 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">{t("common.logout")}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 py-3 flex justify-around items-center z-50 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)] overflow-x-auto print:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/dashboard"}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 min-w-[64px] py-1 transition-all",
                isActive ? "text-primary-600" : "text-slate-400",
              )
            }
          >
            <item.icon className="w-6 h-6" />
            <span className="text-[10px] font-bold tracking-tight uppercase text-center leading-tight">
              {item.name}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 lg:p-10 pb-24 lg:pb-10 min-h-screen flex flex-col min-w-0">
        {/* Subscription Alert Banner */}
        {(isExpired || (isAboutToExpire && !isExpired)) && (
          <div className={cn(
            "mb-6 p-4 rounded-2xl flex items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-500 print:hidden",
            isExpired ? "bg-rose-600 text-white shadow-lg shadow-rose-100" : "bg-amber-50 border border-amber-100 text-amber-800 shadow-sm"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isExpired ? "bg-white/20" : "bg-amber-100")}>
                <CalendarCheck size={20} />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-widest">
                  {isExpired ? "Subscription Expired" : `Subscription Expiring in ${daysLeft} Days`}
                </p>
                <p className="text-[10px] font-medium opacity-80">
                  {isExpired ? "Access to premium features is currently blocked." : "Renew now to avoid service interruption."}
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/dashboard/pricing')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95",
                isExpired ? "bg-white text-rose-600 hover:bg-slate-50" : "bg-amber-600 text-white hover:bg-amber-700"
              )}
            >
              Renew Now
            </button>
          </div>
        )}

        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between mb-6 print:hidden">
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
              B
            </div>
            <span className="font-bold text-slate-800">BuildMate ERP</span>
          </div>
          <button onClick={logout} className="p-2 text-slate-400">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        <Outlet />
        <div className="print:hidden">
          <AIAssistant />
        </div>
      </main>

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Keyboard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Keyboard Shortcuts</h3>
                  <p className="text-xs text-slate-500">Navigate faster using your keyboard</p>
                </div>
              </div>
              <button 
                onClick={() => setShowShortcuts(false)}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {[
                  { key: 'Alt + S', desc: 'Create Sales Invoice' },
                  { key: 'Alt + P', desc: 'Create Purchase Invoice' },
                  { key: 'Alt + I', desc: 'Go to Inventory' },
                  { key: 'Alt + C', desc: 'Go to Customers' },
                  { key: 'Alt + D', desc: 'Go to Dashboard' },
                  { key: 'Alt + R', desc: 'Go to Reports' },
                  { key: 'Alt + K', desc: 'Show this Menu' },
                ].map((shortcut) => (
                  <div key={shortcut.key} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <span className="text-sm font-medium text-slate-600">{shortcut.desc}</span>
                    <kbd className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 font-mono shadow-sm">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 bg-slate-50 text-center border-t border-slate-100">
              <p className="text-[10px] font-medium text-slate-500">
                Mac users can use <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded shadow-sm mx-0.5">Option</kbd> instead of Alt
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
