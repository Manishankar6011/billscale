import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Staff from '../models/Staff';
import Attendance from '../models/Attendance';
import SalaryPayment from '../models/SalaryPayment';
import Tenant from '../models/Tenant';

export const getStaff = async (req: AuthRequest, res: Response) => {
    try {
        const staff = await Staff.find({ tenantId: req.tenantId });
        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching staff' });
    }
};

export const addStaff = async (req: AuthRequest, res: Response) => {
    try {
        // Subscription Constraint Check
        const tenant = await Tenant.findById(req.tenantId);
        if (tenant?.planType === 'free') {
            const staffCount = await Staff.countDocuments({ tenantId: req.tenantId });
            if (staffCount >= 3) {
                return res.status(403).json({
                    message: 'Free Plan limit reached! You can only manage up to 3 staff members. Please upgrade to the Business Plan to add more.'
                });
            }
        }

        const staff = new Staff({
            ...req.body,
            tenantId: req.tenantId
        });
        await staff.save();
        res.status(201).json(staff);
    } catch (error) {
        res.status(400).json({ message: 'Error adding staff member' });
    }
};

export const updateStaff = async (req: AuthRequest, res: Response) => {
    try {
        const staff = await Staff.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenantId },
            req.body,
            { new: true }
        );
        if (!staff) return res.status(404).json({ message: 'Staff member not found' });
        res.json(staff);
    } catch (error) {
        res.status(400).json({ message: 'Error updating staff member' });
    }
};

export const deleteStaff = async (req: AuthRequest, res: Response) => {
    try {
        const staff = await Staff.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
        if (!staff) return res.status(404).json({ message: 'Staff member not found' });
        res.json({ message: 'Staff member deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting staff member' });
    }
};

export const getStaffSummary = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const staff = await Staff.findOne({ _id: id, tenantId: req.tenantId });
        if (!staff) return res.status(404).json({ message: 'Staff not found' });

        const attendance = await Attendance.find({ staffId: id });
        const payments = await SalaryPayment.find({ staffId: id });

        let totalEarned = 0;
        attendance.forEach(record => {
            const dayRate = staff.salaryType === 'monthly' ? staff.salaryAmount / 30 : staff.salaryAmount;
            if (record.status === 'full-day') totalEarned += dayRate;
            else if (record.status === 'half-day') totalEarned += dayRate / 2;
        });

        const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);

        res.json({
            staff,
            workingDays: attendance.filter(a => a.status !== 'absent').length,
            totalEarned,
            totalPaid,
            balance: totalEarned - totalPaid
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching staff summary' });
    }
};

export const paySalary = async (req: AuthRequest, res: Response) => {
    try {
        const { staffId, amount, date, note } = req.body;
        
        const payment = new SalaryPayment({
            tenantId: req.tenantId,
            staffId,
            amount,
            date,
            note
        });

        await payment.save();
        res.status(201).json(payment);
    } catch (error) {
        res.status(400).json({ message: 'Error processing salary payment' });
    }
};
