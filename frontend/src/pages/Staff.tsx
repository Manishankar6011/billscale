import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Users, Search, Trash2, Edit2, Phone, Briefcase } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import type { Staff } from '../types';
import { useAuth } from '../context/AuthContext';
import Skeleton from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { format } from 'date-fns';

const StaffPage = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        role: 'Worker',
        salaryType: 'daily',
        salaryAmount: '',
        status: 'active'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await axios.get('/api/staff', { 
                headers: { Authorization: `Bearer ${user?.token}` } 
            });
            setStaffList(res.data);
        } catch (err) {
            showToast('Error loading staff data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (staff: Staff) => {
        setEditingId(staff._id!);
        setFormData({
            name: staff.name,
            phone: staff.phone,
            role: staff.role,
            salaryType: staff.salaryType,
            salaryAmount: staff.salaryAmount.toString(),
            status: staff.status
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this staff member?')) return;
        try {
            await axios.delete(`/api/staff/${id}`, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            showToast('Staff member deleted successfully', 'success');
            fetchData();
        } catch (err) {
            showToast('Error deleting staff', 'error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await axios.put(`/api/staff/${editingId}`, formData, {
                    headers: { Authorization: `Bearer ${user?.token}` }
                });
                showToast('Staff mapped updated successfully!', 'success');
            } else {
                await axios.post('/api/staff', formData, {
                    headers: { Authorization: `Bearer ${user?.token}` }
                });
                showToast('Staff member added successfully!', 'success');
            }
            setIsModalOpen(false);
            setEditingId(null);
            fetchData();
            setFormData({
                name: '',
                phone: '',
                role: 'Worker',
                salaryType: 'daily',
                salaryAmount: '',
                status: 'active'
            });
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Error saving staff member', 'error');
        }
    };

    const filteredStaff = staffList.filter(staff => 
        staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.phone.includes(searchTerm)
    );

    if (loading) return <Skeleton count={5} />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Staff Management</h1>
                    <p className="text-slate-500">Manage your workforce, roles, and compensation structure</p>
                </div>
                <button 
                    onClick={() => {
                        const currentCount = staffList.length;
                        const plan = user?.planType || 'free';

                        if (plan === 'free') {
                            showToast('Staff Management is only available in Basic & Business plans.', 'error');
                            navigate('/dashboard/pricing');
                            return;
                        }

                        if (plan === 'basic' && currentCount >= 1) {
                            showToast('Basic Plan is limited to 1 staff member. Upgrade to Business for more.', 'error');
                            navigate('/dashboard/pricing');
                            return;
                        }

                        if (plan === 'business' && currentCount >= 5) {
                            showToast('Business Pro Plan is limited to 5 staff members.', 'error');
                            return;
                        }

                        setEditingId(null);
                        setFormData({
                            name: '',
                            phone: '',
                            role: 'Worker',
                            salaryType: 'daily',
                            salaryAmount: '',
                            status: 'active'
                        });
                        setIsModalOpen(true);
                    }}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus size={20} />
                    Add Staff Member
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-2xl border border-slate-100 p-2 flex items-center shadow-sm">
                <Search className="text-slate-400 ml-3 mr-2" size={20} />
                <input 
                    type="text" 
                    placeholder="Search by name, role, or phone..." 
                    className="w-full bg-transparent border-none py-2 pl-2 pr-4 focus:ring-0 text-slate-800 font-medium placeholder:text-slate-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">Employee</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">Contact</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">Role</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">Salary Details</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">Status</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredStaff.map((staff) => (
                                <tr key={staff._id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
                                                {staff.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">{staff.name}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Phone size={14} className="text-slate-400" />
                                            <span className="text-sm font-medium">{staff.phone}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Briefcase size={14} className="text-slate-400" />
                                            <span className="text-sm font-medium">{staff.role}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-800">
                                                ₹{staff.salaryAmount.toLocaleString()}
                                            </span>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                per {staff.salaryType === 'monthly' ? 'month' : 'day'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                            staff.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                        }`}>
                                            {staff.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button 
                                            onClick={() => handleEdit(staff)}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                            title="Edit Staff"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(staff._id!)}
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                            title="Delete Staff"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    {filteredStaff.length === 0 && (
                        <div className="p-8 text-center text-slate-500">
                            No staff members found matching your search.
                        </div>
                    )}
                </div>
            </div>

            {/* Staff Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh] custom-scrollbar">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tighter">
                                {editingId ? 'Edit Staff Member' : 'Add Staff Member'}
                            </h2>
                            <button onClick={() => {
                                setIsModalOpen(false);
                                setEditingId(null);
                            }} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all">&times;</button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Full Name</label>
                                <input 
                                    required
                                    type="text" 
                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 focus:ring-2 transition-all font-bold placeholder:font-medium"
                                    placeholder="Enter full name..."
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Phone Number</label>
                                    <input 
                                        required
                                        type="tel" 
                                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 focus:ring-2 transition-all font-bold"
                                        placeholder="Phone number"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Role/Position</label>
                                    <input 
                                        required
                                        type="text" 
                                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 focus:ring-2 transition-all font-bold"
                                        placeholder="Worker, Supervisor..."
                                        value={formData.role}
                                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Salary Amount</label>
                                    <input 
                                        required
                                        type="number" 
                                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 focus:ring-2 transition-all font-bold"
                                        placeholder="0"
                                        value={formData.salaryAmount}
                                        onChange={(e) => setFormData({...formData, salaryAmount: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Salary Type</label>
                                    <select 
                                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 focus:ring-2 transition-all font-bold"
                                        value={formData.salaryType}
                                        onChange={(e) => setFormData({...formData, salaryType: e.target.value})}
                                    >
                                        <option value="daily">Daily Wage</option>
                                        <option value="monthly">Monthly Fixed</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Status</label>
                                <select 
                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 focus:ring-2 transition-all font-bold"
                                    value={formData.status}
                                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>

                            <button type="submit" className="btn-primary w-full py-5 text-lg shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 font-bold bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200">
                                {editingId ? 'Update Staff Member' : 'Add Staff Member'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffPage;
