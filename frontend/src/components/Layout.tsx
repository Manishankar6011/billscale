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
  Plus
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";
import AIAssistant from "./AIAssistant";

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

  const navItems = [
    { name: t("common.dashboard"), path: "/dashboard", icon: LayoutDashboard },
    { name: t("common.inventory"), path: "/dashboard/inventory", icon: Box },
    {
      name: t("common.purchases"),
      path: "/dashboard/purchases",
      icon: ShoppingCart,
    },
    { name: t("common.sales"), path: "/dashboard/sales", icon: Receipt },
    { name: "Customers", path: "/dashboard/customers", icon: UserRound },
    { name: t("common.staff"), path: "/dashboard/staff", icon: Users },
    {
      name: t("common.attendance"),
      path: "/dashboard/attendance",
      icon: CalendarCheck,
    },
    { name: t("common.salary"), path: "/dashboard/salary", icon: Wallet },
    { name: t("common.ledger"), path: "/dashboard/ledger", icon: FileText },
    { name: t("common.settings"), path: "/dashboard/settings", icon: Settings },
    { name: "Refer & Earn", path: "/dashboard/referral", icon: Gift },
  ];

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-screen lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-100 p-6 fixed h-full overflow-y-auto">
        <div className="mb-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-lg">
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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 py-3 flex justify-around items-center z-50 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)] overflow-x-auto">
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
            <span className="text-[10px] font-bold tracking-tight uppercase">
              {item.name}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 lg:p-10 pb-24 lg:pb-10 min-h-screen flex flex-col">
        {/* Subscription Alert Banner */}
        {(isExpired || (isAboutToExpire && !isExpired)) && (
          <div className={cn(
            "mb-6 p-4 rounded-2xl flex items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-500",
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
        <header className="lg:hidden flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
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
        <AIAssistant />
      </main>
    </div>
  );
};

export default Layout;
