import mongoose, { Schema } from 'mongoose';
import { IAttendance } from '../types';

const attendanceSchema: Schema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    staffId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['full-day', 'half-day', 'absent'],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index to ensure one attendance record per staff per day per tenant
attendanceSchema.index({ tenantId: 1, staffId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ tenantId: 1, date: -1 });

export default mongoose.model<IAttendance>('Attendance', attendanceSchema);
