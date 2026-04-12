import { Response, NextFunction } from 'express';
import Payment from '../models/Payment';
import Attendance from '../models/Attendance';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';

export const addPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { labourId, amount, type, note, method } = req.body;

    try {
        const payment = await Payment.create({
            tenantId: req.tenantId,
            labourId,
            amount,
            type,
            note,
            method
        });
        res.status(201).json(payment);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getPayments = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { labourId } = req.query;

    try {
        const query: any = { tenantId: req.tenantId };
        if (labourId) query.labourId = labourId;

        const payments = await Payment.find(query).populate('labourId').sort({ paymentDate: -1 });
        res.json(payments);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getLabourPaymentSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { labourId } = req.params;

    try {
        const attendanceSummary = await Attendance.aggregate([
            { $match: { 
                labourId: new mongoose.Types.ObjectId(labourId as string), 
                tenantId: new mongoose.Types.ObjectId(req.tenantId as string) 
            } },
            { $group: {
                _id: null,
                totalEarnings: { $sum: { 
                    $cond: [
                        { $eq: ["$status", "present"] }, "$dailyWageAtTime",
                        { $cond: [{ $eq: ["$status", "half-day"] }, { $divide: ["$dailyWageAtTime", 2] }, 0] }
                    ]
                }},
                daysPresent: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
                halfDays: { $sum: { $cond: [{ $eq: ["$status", "half-day"] }, 1, 0] } }
            }}
        ]);

        const paymentSummary = await Payment.aggregate([
            { $match: { 
                labourId: new mongoose.Types.ObjectId(labourId as string), 
                tenantId: new mongoose.Types.ObjectId(req.tenantId as string) 
            } },
            { $group: {
                _id: null,
                totalPaid: { $sum: "$amount" }
            }}
        ]);

        const earnings = attendanceSummary[0] || { totalEarnings: 0, daysPresent: 0, halfDays: 0 };
        const payments = paymentSummary[0] || { totalPaid: 0 };

        res.json({
            labourId,
            totalEarnings: earnings.totalEarnings,
            daysPresent: earnings.daysPresent,
            halfDays: earnings.halfDays,
            totalPaid: payments.totalPaid,
            pendingAmount: earnings.totalEarnings - payments.totalPaid
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
