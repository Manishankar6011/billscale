import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Box, Receipt, Users, AlertCircle, ShoppingCart, TrendingUp, DollarSign, ArrowUpRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Skeleton from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const Dashboard = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [stats, setStats] = useState({
        todaySales: 0,
        monthlyRevenue: 0,
        monthlyProfit: 0,
        todayProfit: 0,
        lowStockCount: 0,
        pendingSalary: 0,
        presentToday: 0,
        totalStaff: 0
    });
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const { data } = await axios.get('/api/dashboard/stats', {
                    headers: { Authorization: `Bearer ${user?.token}` }
                });
                setStats(data.stats);
                setRecentActivity(data.recentActivity || []);
                setAlerts(data.alerts || []);
            } catch (error) {
                console.error('Error fetching dashboard stats', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [user?.token]);

    const statCards = [
        { name: "Today's Sales", value: `₹${stats.todaySales.toLocaleString()}`, icon: Receipt, color: 'text-blue-600', bg: 'bg-blue-50' },
        { name: "Monthly Revenue", value: `₹${stats.monthlyRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { name: "Low Stock Items", value: stats.lowStockCount, icon: Box, color: 'text-rose-600', bg: 'bg-rose-50' },
        { name: "Pending Salary", value: `₹${stats.pendingSalary.toLocaleString()}`, icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">BusinessMate Dashboard</h1>
                    <p className="text-slate-500 font-medium">Real-time metrics for your business growth</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-black uppercase tracking-widest text-slate-800">System Live</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {loading ? (
                    [...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-5">
                            <Skeleton className="w-14 h-14 rounded-2xl" />
                            <div className="space-y-2">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-6 w-24" />
                            </div>
                        </div>
                    ))
                ) : statCards.map((stat) => (
                    <div key={stat.name} className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-5 hover:shadow-xl hover:border-slate-200 transition-all duration-300 group">
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform", stat.bg)}>
                            <stat.icon className={cn("w-7 h-7", stat.color)} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.name}</p>
                            <p className="text-2xl font-black text-slate-800 tracking-tighter">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Recent Sales</h3>
                            <p className="text-sm text-slate-400 font-medium tracking-tight">Latest client transactions</p>
                        </div>
                        <button className="text-primary-600 text-xs font-black uppercase tracking-widest hover:underline">View Ledger</button>
                    </div>
                    <div className="space-y-4">
                        {loading ? (
                            [...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                    <div className="flex items-center gap-4">
                                        <Skeleton className="w-12 h-12 rounded-xl" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-3 w-20" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-10 w-20 rounded-xl" />
                                </div>
                            ))
                        ) : recentActivity.length > 0 ? recentActivity.map((activity) => (
                            <div key={activity.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-primary-600 font-black">
                                        <ShoppingCart size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 group-hover:text-primary-600 transition-colors tracking-tight">{activity.title}</p>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{activity.description}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-slate-800">₹{activity.amount.toLocaleString()}</p>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-tight">{format(new Date(activity.date), 'dd MMM')}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="py-20 text-center">
                                <Box className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-400 font-medium italic">No sales recorded today.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-100 transition-colors"></div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                                <DollarSign size={24} />
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Monthly Profit</span>
                        </div>
                        <p className="text-4xl font-black text-slate-800 tracking-tighter">₹{stats.monthlyProfit.toLocaleString()}</p>
                        <div className="mt-4 flex items-center gap-2 text-emerald-600">
                            <ArrowUpRight size={16} />
                            <span className="text-xs font-bold font-mono">Net Earnings</span>
                        </div>
                    </div>

                    <div className="bg-indigo-600 p-8 rounded-[40px] shadow-2xl shadow-indigo-200 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-700"></div>
                        <h3 className="text-xl font-black tracking-tight mb-8">Staff Presence Today</h3>
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-5xl font-black tracking-tighter mb-2">{stats.presentToday} / {stats.totalStaff}</p>
                                <p className="text-indigo-100 font-bold uppercase tracking-widest text-xs">Members Present</p>
                            </div>
                            <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md border border-white/30">
                                <Users size={32} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm h-full">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            Critical Alerts {alerts.length > 0 && <span className="bg-rose-500 text-white text-[10px] px-2 py-1 rounded-full">{alerts.length}</span>}
                        </h3>
                        <div className="space-y-4">
                            {loading ? (
                                <Skeleton className="h-20 w-full rounded-2xl" />
                            ) : alerts.length > 0 ? alerts.map((alert, i) => (
                                <div key={i} className="p-5 bg-rose-50/50 border border-rose-100 rounded-[28px] shadow-sm relative overflow-hidden group transition-all hover:scale-[1.02]">
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500"></div>
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-white border border-rose-100 flex items-center justify-center text-rose-500 shadow-sm">
                                            <AlertCircle size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-800">{alert.title}</p>
                                            <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">{alert.message}</p>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="py-10 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                    <p className="text-slate-400 font-medium italic">All systems operational.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
