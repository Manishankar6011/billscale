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
        const plan = tenant?.planType || 'free';
        const businessType = tenant?.businessType || 'Retail';
        const staffCount = await Staff.countDocuments({ tenantId: req.tenantId });

        // Subscription Constraint Check
        // Free: 5 staff, Basic: 50 staff, Business: Unlimited
        if (plan === 'free' && staffCount >= 5) {
            return res.status(403).json({
                message: 'Free Plan limit reached! You can add up to 5 staff members on the Free Plan. Upgrade to Basic or Business Plan for more.'
            });
        }
        
        if (plan === 'basic' && staffCount >= 50) {
            return res.status(403).json({
                message: 'Basic Plan limit reached! You can add up to 50 staff members. Upgrade to Business Plan for unlimited staff.'
            });
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

        const attendance = await Attendance.find({ staffId: id }).sort({ date: -1 });
        const payments = await SalaryPayment.find({ staffId: id, tenantId: req.tenantId }).sort({ date: -1 });

        let totalEarned = 0;
        let fullDays = 0;
        let halfDays = 0;
        let absentDays = 0;

        attendance.forEach(record => {
            const dayRate = staff.salaryType === 'monthly' ? staff.salaryAmount / 30 : staff.salaryAmount;
            if (record.status === 'full-day') {
                totalEarned += dayRate;
                fullDays++;
            } else if (record.status === 'half-day') {
                totalEarned += dayRate / 2;
                halfDays++;
            } else {
                absentDays++;
            }
        });

        const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);

        res.json({
            staff,
            workingDays: fullDays + halfDays,
            fullDays,
            halfDays,
            absentDays,
            totalEarned,
            totalPaid,
            balance: totalEarned - totalPaid,
            // Full payment history - "kab-kab kitna diya"
            payments: payments.map(p => ({
                _id: p._id,
                amount: p.amount,
                date: p.date,
                note: p.note,
                createdAt: p.createdAt
            })),
            // Recent 31-day attendance records
            recentAttendance: attendance.slice(0, 31).map(a => ({
                _id: a._id,
                date: a.date,
                status: a.status
            }))
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

export const deleteSalaryPayment = async (req: AuthRequest, res: Response) => {
    try {
        const { paymentId } = req.params;
        const payment = await SalaryPayment.findOneAndDelete({
            _id: paymentId,
            tenantId: req.tenantId
        });
        if (!payment) return res.status(404).json({ message: 'Payment record not found' });
        res.json({ message: 'Payment deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting payment' });
    }
};
