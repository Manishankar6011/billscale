import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Customer from '../models/Customer';

// @desc    Search customers by name or phone
// @route   GET /api/customers/search
// @access  Private
export const searchCustomers = async (req: AuthRequest, res: Response) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(200).json([]);
        }

        const tenantId = req.tenantId;
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

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
export const getCustomers = async (req: AuthRequest, res: Response) => {
    try {
        const tenantId = req.tenantId;
        const customers = await Customer.find({ tenantId }).sort({ createdAt: -1 });
        res.status(200).json(customers);
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
        const existingCustomer = await Customer.findOne({ tenantId, phone });
        if (existingCustomer) {
            return res.status(400).json({ message: 'Customer with this phone number already exists' });
        }

        const customer = new Customer({
            tenantId,
            name,
            phone,
            email,
            address
        });

        await customer.save();
        res.status(201).json(customer);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};
