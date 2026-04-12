import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import compression from 'compression';

dotenv.config();

const app = express();

// Middleware
app.use(compression()); // Speed up app by compressing responses
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Route Imports
import authRoutes from './routes/authRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import transactionRoutes from './routes/transactionRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import staffRoutes from './routes/staffRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import subscriptionRoutes from './routes/subscriptionRoutes';

// Use API Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/subscription', subscriptionRoutes);

// Keep-Alive & Health Check
app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'up', timestamp: new Date() });
});

// Production: Serve Static Files
if (process.env.NODE_ENV === 'production') {
    // When running from backend/dist, we need to go up two directory levels
    const frontendPath = path.join(__dirname, '../../frontend/dist');
    app.use(express.static(frontendPath));

    app.get(/.*/, (req: Request, res: Response) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
} else {
    app.get('/', (req: Request, res: Response) => {
        res.send('BuildMate ERP API is running (Development Mode)...');
    });
}

// Database Connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/buildmate_erp';

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('MongoDB connected...');
        if (process.env.NODE_ENV !== 'test') {
            app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
        }
    })
    .catch(err => console.log(err));

export default app;
