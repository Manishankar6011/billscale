import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Product from '../models/Product';
import Sale from '../models/Sale';
import Staff from '../models/Staff';
import Attendance from '../models/Attendance';
import SalaryPayment from '../models/SalaryPayment';
import mongoose from 'mongoose';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
    try {
        const tenantId = new mongoose.Types.ObjectId(req.tenantId as string);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [
            todaySalesAgg,
            monthlyStatsAgg,
            todayProfitAgg,
            lowStockProducts,
            staffPresentToday,
            allStaff,
            allAttendance,
            allPayments,
            recentSales
        ] = await Promise.all([
            // Today's Sales
            Sale.aggregate([
                { $match: { tenantId, date: { $gte: today } } },
                { $group: { _id: null, total: { $sum: "$totalAmount" } } }
            ]),
            // Monthly Revenue & Profit
            Sale.aggregate([
                { $match: { tenantId, date: { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: "$totalAmount" }, profit: { $sum: "$totalProfit" } } }
            ]),
            // Today's Profit specifically
            Sale.aggregate([
                { $match: { tenantId, date: { $gte: today } } },
                { $group: { _id: null, profit: { $sum: "$totalProfit" } } }
            ]),
            // Low Stock
            Product.find({ 
                tenantId, 
                $expr: { $lte: ["$stock", "$minStockAlert"] } 
            }),
            // Staff Present Today
            Attendance.countDocuments({ tenantId, date: today, status: { $ne: 'absent' } }),
            // Staff Data for Salary Pending calculation
            Staff.find({ tenantId, status: 'active' }),
            Attendance.find({ tenantId }),
            SalaryPayment.find({ tenantId }),
            Sale.find({ tenantId }).sort({ date: -1 }).limit(5).populate('items.productId', 'name')
        ]);

        const todaySales = todaySalesAgg[0]?.total || 0;
        const monthlyRevenue = monthlyStatsAgg[0]?.total || 0;
        const monthlyProfit = monthlyStatsAgg[0]?.profit || 0;
        const todayProfit = todayProfitAgg[0]?.profit || 0;

        // Calculate total pending salary
        let totalPendingSalary = 0;
        const paymentsMap = new Map();
        allPayments.forEach(p => {
            const current = paymentsMap.get(p.staffId.toString()) || 0;
            paymentsMap.set(p.staffId.toString(), current + p.amount);
        });

        const attendanceMap = new Map();
        allAttendance.forEach(a => {
            const current = attendanceMap.get(a.staffId.toString()) || 0;
            const value = a.status === 'full-day' ? 1 : (a.status === 'half-day' ? 0.5 : 0);
            attendanceMap.set(a.staffId.toString(), current + value);
        });

        allStaff.forEach(s => {
            const days = attendanceMap.get(s._id.toString()) || 0;
            const earned = s.salaryType === 'daily' ? days * s.salaryAmount : s.salaryAmount;
            const paid = paymentsMap.get(s._id.toString()) || 0;
            totalPendingSalary += (earned - paid);
        });

        const alerts = lowStockProducts.map(p => ({
            type: 'stock',
            title: 'Low Stock Alert',
            message: `${p.name} is low on stock (${p.stock} ${p.unit} remaining)`,
            severity: 'high'
        }));

        res.status(200).json({
            stats: {
                todaySales,
                monthlyRevenue,
                monthlyProfit,
                todayProfit,
                lowStockCount: lowStockProducts.length,
                pendingSalary: totalPendingSalary,
                presentToday: staffPresentToday,
                totalStaff: allStaff.length
            },
            recentActivity: recentSales.map(s => ({
                id: s._id,
                title: `Invoice to ${s.customerName}`,
                description: `${s.items.length} items sold`,
                amount: s.totalAmount,
                date: s.date
            })),
            alerts: alerts
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
