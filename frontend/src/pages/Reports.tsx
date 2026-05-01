import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
} from 'recharts';
import { 
    TrendingUp, 
    BarChart3, 
    Clock, 
    Filter, 
    Download, 
    Calendar,
    ChevronRight,
    ArrowUpRight,
    Package,
    Activity
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { canUseFeature } from '../utils/planLimits';
import UpgradePrompt from '../components/UpgradePrompt';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => `${i}:00`);

const Reports = () => {
    const { user } = useAuth();
    const [days, setDays] = useState(30);

    if (user?.planType === 'free') {
        return (
            <UpgradePrompt 
                feature="Advanced Reports" 
                description="Unlock deep business insights like traffic heatmaps, fastest-selling items, and peak hour analysis to grow your business faster." 
            />
        );
    }

    const { data: fastestSelling, isLoading: loadingFastest } = useQuery({
        queryKey: ['fastest-selling', days],
        queryFn: async () => {
            const res = await axios.get(`/api/analytics/fastest-selling?days=${days}`);
            return res.data;
        }
    });

    const { data: heatmapData, isLoading: loadingHeatmap } = useQuery({
        queryKey: ['heatmap', days],
        queryFn: async () => {
            const res = await axios.get(`/api/analytics/heatmap?days=${days}`);
            return res.data;
        }
    });

    const { data: hourlyStats, isLoading: loadingHourly } = useQuery({
        queryKey: ['hourly', days],
        queryFn: async () => {
            const res = await axios.get(`/api/analytics/hourly?days=${days}`);
            return res.data;
        }
    });

    // Process heatmap data into a 2D array [day][hour]
    const processedHeatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
    let maxHeat = 0;
    (heatmapData || []).forEach((item: any) => {
        // MongoDB dayOfWeek is 1 (Sun) to 7 (Sat)
        const d = item.dayOfWeek - 1;
        const h = item.hour;
        if (processedHeatmap[d] && h !== undefined) {
            processedHeatmap[d][h] = item.count;
            if (item.count > maxHeat) maxHeat = item.count;
        }
    });

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#6366f1'];

    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/50 p-8 rounded-[2.5rem] border border-white/40 backdrop-blur-md shadow-sm ring-1 ring-slate-200/50">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-700 rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-100 transition-transform hover:scale-105 duration-500">
                        <BarChart3 className="text-white" size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-1">Advanced Reports</h1>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] opacity-60 flex items-center gap-2">
                            <Activity size={12} className="text-indigo-500" />
                            Deep Business Insights & Analytics
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 shadow-inner overflow-x-auto no-scrollbar max-w-full">
                    {[7, 30, 90, 365].map((d) => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={cn(
                                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap flex-shrink-0",
                                days === d 
                                    ? "bg-white text-indigo-600 shadow-lg ring-1 ring-slate-200/50 scale-105" 
                                    : "text-slate-500 hover:text-slate-800"
                            )}
                        >
                            Last {d === 365 ? 'Year' : d + ' Days'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Fastest Selling Items */}
                <div className="card p-8 bg-white/70 backdrop-blur-xl border border-white/40 shadow-2xl shadow-slate-200/50 rounded-[3rem] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 text-indigo-50 opacity-10 group-hover:scale-110 transition-transform duration-700">
                        <TrendingUp size={160} />
                    </div>
                    
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-50">
                                <TrendingUp size={24} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Fastest Selling Items</h3>
                        </div>
                        <button className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100">
                            <Download size={18} />
                        </button>
                    </div>

                    <div className="h-[400px] w-full relative z-10">
                        {loadingFastest ? (
                            <div className="flex items-center justify-center h-full animate-pulse text-slate-300">
                                <Activity size={40} className="animate-spin" />
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={fastestSelling} layout="vertical" margin={{ left: 40, right: 30, top: 10, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis 
                                        dataKey="name" 
                                        type="category" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        width={100}
                                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }}
                                    />
                                    <Tooltip 
                                        cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                                        content={({ active, payload }: any) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-white/90 backdrop-blur-md border border-slate-200 p-4 rounded-2xl shadow-xl">
                                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">{data.name}</p>
                                                        <div className="space-y-1">
                                                            <div className="flex justify-between gap-4 text-xs">
                                                                <span className="text-slate-500">Sold Quantity:</span>
                                                                <span className="font-black text-slate-900">{data.totalQuantity} {data.unit}</span>
                                                            </div>
                                                            <div className="flex justify-between gap-4 text-xs">
                                                                <span className="text-slate-500">Revenue:</span>
                                                                <span className="font-black text-emerald-600">₹{data.totalRevenue?.toLocaleString()}</span>
                                                            </div>
                                                            <div className="flex justify-between gap-4 text-xs text-indigo-600">
                                                                <span className="font-bold">Total Sales:</span>
                                                                <span className="font-black">{data.saleCount} times</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="totalQuantity" radius={[0, 8, 8, 0]} barSize={20}>
                                        {(fastestSelling || []).map((_: any, index: number) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={COLORS[index % COLORS.length] || '#6366f1'} 
                                                fillOpacity={0.8} 
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Hourly Sales Traffic */}
                <div className="card p-8 bg-white/70 backdrop-blur-xl border border-white/40 shadow-2xl shadow-slate-200/50 rounded-[3rem] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 text-amber-50 opacity-10 group-hover:scale-110 transition-transform duration-700">
                        <Clock size={160} />
                    </div>
                    
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-50">
                                <Clock size={24} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Hourly Peak Traffic</h3>
                        </div>
                    </div>

                    <div className="h-[400px] w-full relative z-10">
                        {loadingHourly ? (
                             <div className="flex items-center justify-center h-full animate-pulse text-slate-300">
                                <Activity size={40} className="animate-spin" />
                             </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={hourlyStats} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="hour" 
                                        axisLine={false} 
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }}
                                        tickFormatter={(h) => `${h}:00`}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} />
                                    <Tooltip 
                                        cursor={{ fill: 'rgba(245, 158, 11, 0.05)' }}
                                        content={({ active, payload }: any) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-white/90 backdrop-blur-md border border-slate-200 p-4 rounded-2xl shadow-xl">
                                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">{payload[0].payload.hour}:00 Hour</p>
                                                        <p className="text-sm font-black text-slate-900">{payload[0].value} Invoices Generated</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#f59e0b" fillOpacity={0.8} barSize={15} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>            {/* Sales Heatmap (Crowd Analysis) */}
            <div className="card p-10 bg-white/70 backdrop-blur-xl border border-white/40 shadow-2xl shadow-slate-200/50 rounded-[3.5rem] relative overflow-visible group">
                <div className="absolute top-0 right-0 p-12 text-indigo-500 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000">
                    <Calendar size={240} />
                </div>
                
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-indigo-50/50 ring-4 ring-white">
                                <Calendar size={28} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Traffic Heatmap</h3>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest opacity-60">Weekly peak hours & crowd analysis</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 bg-slate-50/80 px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Intensity:</span>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-4 h-4 rounded-md bg-slate-100 border border-slate-200"></div>
                                    <div className="w-4 h-4 rounded-md bg-indigo-100"></div>
                                    <div className="w-4 h-4 rounded-md bg-indigo-300"></div>
                                    <div className="w-4 h-4 rounded-md bg-indigo-500 shadow-md"></div>
                                    <div className="w-4 h-4 rounded-md bg-indigo-700 shadow-lg"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto no-scrollbar pb-8 relative z-10">
                        <div className="min-w-[900px] space-y-3 pt-16">
                            {/* Hours Label */}
                            <div className="flex items-center gap-6 relative z-0">
                                <div className="w-24 shrink-0"></div>
                                <div className="flex-1 grid grid-cols-24 gap-2">
                                    {HOURS.map((h, i) => (
                                        <div key={h} className="text-[8px] md:text-[9px] font-black text-slate-400 text-center uppercase tracking-tighter">
                                            {h}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {processedHeatmap.map((dayRow, dayIdx) => (
                                <div key={dayIdx} className="flex items-center gap-6 group/row relative hover:z-[100] overflow-visible">
                                    <div className="w-24 shrink-0 text-xs font-black text-slate-500 uppercase tracking-[0.15em] group-hover/row:text-indigo-600 transition-colors">
                                        {DAYS_OF_WEEK[dayIdx]}
                                    </div>
                                    <div className="flex-1 grid grid-cols-24 gap-2 h-12">
                                        {dayRow.map((count, hourIdx) => {
                                            const intensity = maxHeat > 0 ? count / maxHeat : 0;
                                            return (
                                                <div 
                                                    key={hourIdx}
                                                    className={cn(
                                                        "rounded-lg transition-all duration-500 hover:scale-125 hover:z-20 cursor-pointer relative group/cell ring-2 ring-transparent hover:ring-white shadow-sm hover:shadow-xl",
                                                        count === 0 ? "bg-slate-50/50 border border-slate-100" : "bg-indigo-600"
                                                    )}
                                                    style={{ 
                                                        opacity: count === 0 ? 0.5 : 0.2 + (intensity * 0.8),
                                                    }}
                                                >
                                                    {/* Custom Tooltip on Hover */}
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2 bg-slate-900 text-white text-[10px] font-black rounded-xl opacity-0 group-hover/cell:opacity-100 pointer-events-none transition-all scale-75 group-hover/cell:scale-100 whitespace-nowrap z-[200] shadow-2xl">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className="opacity-60">{DAYS_OF_WEEK[dayIdx]} • {hourIdx}:00</span>
                                                            <span className="text-xs">{count} Sales</span>
                                                        </div>
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900"></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                                <Clock size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Traffic Peak Analysis</p>
                                <p className="text-[10px] text-slate-500 font-medium">Darker cells indicate higher volume of sales invoices.</p>
                            </div>
                        </div>
                        <button className="px-6 py-3 bg-white text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:shadow-md transition-all active:scale-95 border border-indigo-100">
                            View Detailed Logs
                        </button>
                    </div>
                </div>
            </div>

            {/* Insight Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-8 bg-white/50 border border-slate-100 rounded-[2.5rem] flex flex-col gap-4 group hover:bg-white hover:shadow-xl transition-all duration-500">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm">Growth Trend</h4>
                        <p className="text-xs text-slate-500 font-medium mt-1">Identify which products are gaining popularity this month.</p>
                    </div>
                    <ChevronRight size={20} className="text-slate-300 ml-auto mt-auto group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                </div>
                <div className="p-8 bg-white/50 border border-slate-100 rounded-[2.5rem] flex flex-col gap-4 group hover:bg-white hover:shadow-xl transition-all duration-500">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Package size={24} />
                    </div>
                    <div>
                        <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm">Stock Turnover</h4>
                        <p className="text-xs text-slate-500 font-medium mt-1">See how fast your inventory is being converted to sales.</p>
                    </div>
                    <ChevronRight size={20} className="text-slate-300 ml-auto mt-auto group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </div>
                <div className="p-8 bg-white/50 border border-slate-100 rounded-[2.5rem] flex flex-col gap-4 group hover:bg-white hover:shadow-xl transition-all duration-500">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ArrowUpRight size={24} />
                    </div>
                    <div>
                        <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm">Profit Optimization</h4>
                        <p className="text-xs text-slate-500 font-medium mt-1">Focus on items that bring the highest profit margins.</p>
                    </div>
                    <ChevronRight size={20} className="text-slate-300 ml-auto mt-auto group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
                </div>
            </div>
        </div>
    );
};

export default Reports;
