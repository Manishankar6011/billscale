import mongoose from 'mongoose';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Customer from '../models/Customer';

// @desc    Search customers by name or phone
// @route   GET /api/customers/search
// @access  Private
export const searchCustomers = async (req: AuthRequest, res: Response) => {
    try {
        const { query } = req.query;
        const tenantId = req.tenantId;
        
        if (!query) {
            const recentCustomers = await Customer.find({ tenantId }).sort({ createdAt: -1 }).limit(10);
            return res.status(200).json(recentCustomers);
        }

        const customers = await Customer.find({
            tenantId,
            $or: [
                { name: { $regex: query as string, $options: 'i' } },
                { phone: { $regex: query as string, $options: 'i' } }
            ]
        }).limit(10);

        res.status(200).json(customers);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get all customers with stats
// @route   GET /api/customers
// @access  Private
export const getCustomers = async (req: AuthRequest, res: Response) => {
    try {
        const tenantId = new mongoose.Types.ObjectId(req.tenantId as string);
        
        // Use aggregation to get customers and their stats from Sales
        const customersWithStats = await Customer.aggregate([
            { $match: { tenantId } },
            {
                $lookup: {
                    from: 'sales',
                    let: { custPhone: '$phone', custName: '$name' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$tenantId', tenantId] },
                                        {
                                            $or: [
                                                { $and: [{ $ne: ['$$custPhone', null] }, { $eq: ['$customerPhone', '$$custPhone'] }] },
                                                { $and: [{ $eq: ['$$custPhone', null] }, { $eq: ['$customerName', '$$custName'] }] }
                                            ]
                                        }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'sales'
                }
            },
            {
                $project: {
                    name: 1,
                    phone: 1,
                    address: 1,
                    totalSales: { $size: '$sales' },
                    totalAmount: { $sum: '$sales.totalAmount' },
                    totalPaid: { $sum: '$sales.amountPaid' },
                    totalDue: { $sum: '$sales.balanceDue' },
                    lastSaleDate: { $max: '$sales.date' },
                    invoiceCount: { $size: '$sales' }
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);

        res.status(200).json(customersWithStats);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Create new customer
// @route   POST /api/customers
// @access  Private
export const createCustomer = async (req: AuthRequest, res: Response) => {
    try {
        const { name, phone, email, address } = req.body;
        const tenantId = req.tenantId;

        // Check if phone already exists for this tenant
        if (phone) {
            const existingCustomer = await Customer.findOne({ tenantId, phone });
            if (existingCustomer) {
                return res.status(400).json({ message: 'Customer with this phone number already exists' });
            }
        }

        const customer = new Customer({
            tenantId,
            name,
            phone: phone || undefined,
            email,
            address
        });

        await customer.save();
        res.status(201).json(customer);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};
