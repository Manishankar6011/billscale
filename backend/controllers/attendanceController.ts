import { Response } from 'express';
import Attendance from '../models/Attendance';
import { AuthRequest } from '../middleware/auth';

// @desc    Mark attendance for multiple staff members
// @route   POST /api/attendance
export const markAttendance = async (req: AuthRequest, res: Response) => {
    const { date, records } = req.body; // records: [{ staffId, status }]

    try {
        const attendancePromises = records.map((record: any) => {
            return Attendance.findOneAndUpdate(
                { 
                    staffId: record.staffId, 
                    date: new Date(date).setHours(0, 0, 0, 0),
                    tenantId: req.tenantId
                },
                { 
                    status: record.status, 
                    tenantId: req.tenantId
                },
                { upsert: true, new: true }
            );
        });

        await Promise.all(attendancePromises);
        res.status(200).json({ message: 'Attendance marked successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get attendance records
// @route   GET /api/attendance
export const getAttendance = async (req: AuthRequest, res: Response) => {
    const { date, staffId } = req.query;
    
    try {
        const query: any = { tenantId: req.tenantId };
        if (staffId) query.staffId = staffId;
        if (date) query.date = new Date(date as string).setHours(0, 0, 0, 0);

        const attendance = await Attendance.find(query).populate('staffId', 'name role');
        res.status(200).json(attendance);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
