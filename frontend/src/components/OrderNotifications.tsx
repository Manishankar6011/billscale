import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Bell, ShoppingBag, X, Check, ExternalLink, Phone, MapPin, RefreshCw, Sparkles, CreditCard, Clock } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { CatalogOrder } from '../types';

export const OrderNotifications: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();

    const [orders, setOrders] = useState<CatalogOrder[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [filter, setFilter] = useState<'pending' | 'all' | 'online'>('pending');
    const [isLoading, setIsLoading] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const [onlineSummary, setOnlineSummary] = useState<{ totalAmount: number; count: number }>({ totalAmount: 0, count: 0 });

    // Subtle audio chime on new order
    const playOrderChime = useCallback(() => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2); // A5
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.35);
        } catch {
            // Audio context not allowed without interaction
        }
    }, []);

    const fetchOrders = useCallback(async () => {
        if (!user?.token) return;
        try {
            setIsLoading(true);
            const res = await axios.get('/api/catalog/orders', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            if (res.data?.orders) {
                setOrders(res.data.orders);
                if (res.data?.onlineSummary) {
                    setOnlineSummary(res.data.onlineSummary);
                } else {
                    const paid = res.data.orders.filter((o: any) => o.paymentStatus === 'paid');
                    setOnlineSummary({
                        totalAmount: paid.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0),
                        count: paid.length
                    });
                }
            }
        } catch (err) {
            console.error('Failed to fetch orders', err);
        } finally {
            setIsLoading(false);
        }
    }, [user?.token]);

    // Request browser desktop notification permission once
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {});
        }
    }, []);

    const sendDesktopNotification = useCallback((title: string, body: string) => {
        try {
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                new Notification(title, {
                    body,
                    icon: '/pwa-192x192.png',
                });
            }
        } catch {
            // ignore
        }
    }, []);

    // Initial fetch + Pure Event-Driven SSE push (Optimized: Zero polling spam)
    useEffect(() => {
        if (!user?.token) return;
        // Fetch only once on mount
        fetchOrders();

        let eventSource: EventSource | null = null;
        try {
            const sseUrl = `/api/catalog/orders/stream?token=${encodeURIComponent(user.token)}`;
            eventSource = new EventSource(sseUrl);

            eventSource.addEventListener('new_order', (e: MessageEvent) => {
                try {
                    const newOrder: CatalogOrder = JSON.parse(e.data);
                    setOrders(prev => [newOrder, ...prev.filter(o => o._id !== newOrder._id)]);
                    setHasUnread(true);
                    playOrderChime();
                    showToast(`🛍️ Naya Catalog Order #${newOrder.orderNumber}! Customer: ${newOrder.customerName} (₹${newOrder.totalAmount})`, 'success');
                    sendDesktopNotification(
                        `🛍️ Naya Catalog Order #${newOrder.orderNumber}`,
                        `${newOrder.customerName} ne ₹${newOrder.totalAmount} ka order place kiya hai.`
                    );
                } catch (err) {
                    console.error('Error parsing SSE new_order:', err);
                }
            });

            eventSource.addEventListener('order_paid', (e: MessageEvent) => {
                try {
                    const paidOrder: CatalogOrder = JSON.parse(e.data);
                    setOrders(prev => prev.map(o => o._id === paidOrder._id ? ({ ...o, ...paidOrder, paymentStatus: 'paid' } as CatalogOrder) : o));
                    setOnlineSummary(prev => ({
                        totalAmount: prev.totalAmount + (paidOrder.totalAmount || 0),
                        count: prev.count + 1
                    }));
                    playOrderChime();
                    showToast(`💳 Order #${paidOrder.orderNumber} PAID ONLINE (₹${paidOrder.totalAmount}) by ${paidOrder.customerName}!`, 'success');
                    sendDesktopNotification(
                        `💳 Payment Confirmed: Order #${paidOrder.orderNumber}`,
                        `${paidOrder.customerName} ne ₹${paidOrder.totalAmount} ka online payment complete kiya!`
                    );
                } catch (err) {
                    console.error('Error parsing SSE order_paid:', err);
                }
            });

            eventSource.onerror = () => {
                // EventSource handles reconnection automatically
            };
        } catch (err) {
            console.error('SSE setup failed:', err);
        }

        // Only soft-sync if tab gains focus after prolonged inactive background duration (>2 minutes)
        let lastSync = Date.now();
        const handleWindowFocus = () => {
            const now = Date.now();
            if (now - lastSync > 120000) {
                lastSync = now;
                fetchOrders();
            }
        };
        window.addEventListener('focus', handleWindowFocus);

        return () => {
            if (eventSource) eventSource.close();
            window.removeEventListener('focus', handleWindowFocus);
        };
    }, [user?.token, fetchOrders, playOrderChime, showToast, sendDesktopNotification]);

    const pendingOrders = orders.filter(o => o.status === 'pending');
    const onlineOrders = orders.filter(o => o.paymentStatus === 'paid');
    const pendingCount = pendingOrders.length;

    const handleGenerateBill = async (order: CatalogOrder) => {
        try {
            // Update status on server to 'billed'
            await axios.put(`/api/catalog/orders/${order._id}/status`, {
                status: 'billed'
            }, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });

            setOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: 'billed' } : o));
            setIsOpen(false);

            // Dispatch event to pre-fill the sales modal
            const dispatchBillEvent = () => {
                window.dispatchEvent(new CustomEvent('open-bill-order', {
                    detail: { order }
                }));
            };

            if (location.pathname === '/dashboard/sales') {
                dispatchBillEvent();
            } else {
                navigate('/dashboard/sales');
                // Give React router time to mount Sales page
                setTimeout(dispatchBillEvent, 250);
            }
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to update order', 'error');
        }
    };

    const handleCancelOrder = async (order: CatalogOrder) => {
        if (!window.confirm(`Are you sure you want to cancel order #${order.orderNumber}?`)) return;
        try {
            await axios.put(`/api/catalog/orders/${order._id}/status`, {
                status: 'cancelled'
            }, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            setOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: 'cancelled' } : o));
            showToast('Order cancelled', 'info');
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to cancel order', 'error');
        }
    };

    const displayedOrders = filter === 'pending' ? pendingOrders : orders;

    return (
        <>
            {/* Bell Button (Desktop & Mobile header friendly) */}
            <div className="relative inline-block">
                <button
                    type="button"
                    onClick={() => {
                        setIsOpen(!isOpen);
                        setHasUnread(false);
                    }}
                    className={`relative p-2.5 rounded-2xl border transition-all duration-300 active:scale-95 flex items-center justify-center ${
                        pendingCount > 0
                            ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-md shadow-amber-100 hover:bg-amber-100'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm'
                    }`}
                    title="Catalog Orders & Notifications"
                >
                    <Bell size={18} className={pendingCount > 0 ? 'animate-bounce' : ''} />
                    {pendingCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                            {pendingCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Slide-over Drawer / Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-end p-2 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-right duration-300">
                        {/* Drawer Header */}
                        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-amber-50/40 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-200">
                                    <ShoppingBag size={20} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800 text-base leading-tight">Catalog Orders</h3>
                                    <p className="text-xs text-slate-500 font-medium">Real-time orders from your online store</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={fetchOrders}
                                    disabled={isLoading}
                                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                                    title="Refresh orders"
                                >
                                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Online Revenue Stats Banner */}
                        <div className="mx-5 mt-3 p-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200/70 rounded-2xl flex items-center justify-between shadow-2xs">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                                    <CreditCard size={15} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-800">
                                        Online Collection
                                    </p>
                                    <p className="text-sm font-black text-slate-900 leading-none mt-0.5">
                                        ₹{onlineSummary.totalAmount.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-lg">
                                    {onlineSummary.count} Paid Orders
                                </span>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex px-5 pt-3 gap-2 border-b border-slate-100">
                            <button
                                onClick={() => setFilter('pending')}
                                className={`pb-2.5 px-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 ${
                                    filter === 'pending'
                                        ? 'border-amber-500 text-amber-600'
                                        : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                Pending
                                {pendingCount > 0 && (
                                    <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-700 text-[10px]">
                                        {pendingCount}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setFilter('online')}
                                className={`pb-2.5 px-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 ${
                                    filter === 'online'
                                        ? 'border-emerald-600 text-emerald-700'
                                        : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                💳 Online Paid ({onlineOrders.length})
                            </button>
                            <button
                                onClick={() => setFilter('all')}
                                className={`pb-2.5 px-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
                                    filter === 'all'
                                        ? 'border-primary-600 text-primary-600'
                                        : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                All Orders ({orders.length})
                            </button>
                        </div>

                        {/* Orders List */}
                        <div className="p-4 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
                            {displayedOrders.length === 0 ? (
                                <div className="text-center py-12 px-4">
                                    <div className="w-14 h-14 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400 mx-auto mb-3">
                                        <ShoppingBag size={24} />
                                    </div>
                                    <p className="text-sm font-black text-slate-700">No {filter} orders</p>
                                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                                        When customers place orders from your catalog link or custom domain, they appear here instantly.
                                    </p>
                                </div>
                            ) : (
                                displayedOrders.map((order) => (
                                    <div
                                        key={order._id}
                                        className={`p-4 rounded-2xl border transition-all ${
                                            order.status === 'pending'
                                                ? 'bg-amber-50/30 border-amber-200/80 shadow-xs'
                                                : order.status === 'billed'
                                                ? 'bg-slate-50 border-slate-200 opacity-90'
                                                : 'bg-rose-50/20 border-rose-100 opacity-70'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-sm text-slate-800">
                                                        {order.customerName}
                                                    </span>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600">
                                                        #{order.orderNumber}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                                    {order.customerPhone && (
                                                        <a
                                                            href={`tel:${order.customerPhone}`}
                                                            className="flex items-center gap-1 hover:text-primary-600"
                                                        >
                                                            <Phone size={10} /> {order.customerPhone}
                                                        </a>
                                                    )}
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                                        <Clock size={10} />
                                                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Status Badges */}
                                            <div className="flex flex-col items-end gap-1">
                                                {order.paymentStatus === 'paid' ? (
                                                    <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs flex items-center gap-1">
                                                        <Check size={10} className="stroke-[3]" />
                                                        💳 PAID ONLINE
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs flex items-center gap-1">
                                                        <Clock size={10} />
                                                        {order.paymentMethod === 'cod' ? '🚚 COD (Unpaid)' : '⚪ Pending (Unpaid)'}
                                                    </span>
                                                )}
                                                {order.paymentGatewayPaymentId && (
                                                    <span className="text-[8px] font-bold text-slate-400 font-mono">
                                                        ID: {order.paymentGatewayPaymentId}
                                                    </span>
                                                )}
                                                {order.status === 'billed' && (
                                                    <span className="text-[9px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                                                        ✓ Billed
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Address / Notes if any */}
                                        {order.customerAddress && (
                                            <p className="text-xs text-slate-600 flex items-center gap-1 mb-2 bg-white/70 px-2 py-1 rounded-lg">
                                                <MapPin size={11} className="text-slate-400 shrink-0" />
                                                <span className="truncate">{order.customerAddress}</span>
                                            </p>
                                        )}

                                        {/* Items */}
                                        <div className="bg-white rounded-xl p-2.5 border border-slate-100 text-xs space-y-1 mb-3">
                                            {order.items.map((it, idx) => (
                                                <div key={idx} className="flex justify-between text-slate-700">
                                                    <span className="font-medium">
                                                        <span className="font-bold">{it.quantity}x</span> {it.name}
                                                    </span>
                                                    <span className="font-bold text-slate-900">
                                                        ₹{(it.price * it.quantity).toLocaleString()}
                                                    </span>
                                                </div>
                                            ))}
                                            <div className="border-t border-slate-100 pt-1.5 flex justify-between font-black text-slate-900 text-xs">
                                                <span>Total Amount</span>
                                                <span className="text-primary-600 text-sm">₹{order.totalAmount.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex items-center justify-between gap-2 pt-1">
                                            {order.customerPhone && (
                                                <a
                                                    href={`https://wa.me/${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                                        `Hello ${order.customerName}, regarding your order #${order.orderNumber} for ₹${order.totalAmount}...`
                                                    )}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all"
                                                >
                                                    WhatsApp
                                                </a>
                                            )}

                                            <div className="flex items-center gap-2 ml-auto">
                                                {order.status === 'pending' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCancelOrder(order)}
                                                        className="px-3 py-1.5 text-slate-400 hover:text-rose-600 text-xs font-bold transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => handleGenerateBill(order)}
                                                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-primary-200 transition-all flex items-center gap-1.5 active:scale-95"
                                                >
                                                    <Sparkles size={13} />
                                                    Generate Bill
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default OrderNotifications;

