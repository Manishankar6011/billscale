import mongoose from 'mongoose';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Customer from '../models/Customer';
import CustomerPayment from '../models/CustomerPayment';
import Sale from '../models/Sale';

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
                    let: { custId: '$_id', custPhone: '$phone', custName: '$name' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$tenantId', tenantId] },
                                        {
                                            $or: [
                                                { $eq: ['$customerId', '$$custId'] },
                                                { 
                                                    $and: [
                                                        { $eq: [{ $ifNull: ['$customerId', null] }, null] },
                                                        { $ne: [{ $ifNull: ['$$custPhone', ""] }, ""] }, 
                                                        { $eq: ['$customerPhone', '$$custPhone'] }
                                                    ] 
                                                },
                                                { 
                                                    $and: [
                                                        { $eq: [{ $ifNull: ['$customerId', null] }, null] },
                                                        { $eq: [{ $ifNull: ['$$custPhone', ""] }, ""] }, 
                                                        { $eq: [{ $toLower: { $ifNull: ['$customerName', ""] } }, { $toLower: { $ifNull: ['$$custName', ""] } }] }
                                                    ] 
                                                }
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
                $lookup: {
                    from: 'customerpayments',
                    localField: '_id',
                    foreignField: 'customerId',
                    as: 'payments'
                }
            },
            {
                $project: {
                    name: 1,
                    phone: 1,
                    address: 1,
                    totalSales: { $size: '$sales' },
                    totalAmount: { $sum: '$sales.totalAmount' },
                    totalPaidFromSales: {
                        $sum: {
                            $map: {
                                input: '$sales',
                                as: 'sale',
                                in: { $ifNull: ['$$sale.downPayment', '$$sale.amountPaid'] }
                            }
                        }
                    },
                    totalPaidFromPayments: { $sum: '$payments.amount' },
                    lastSaleDate: { $max: '$sales.date' },
                    invoiceCount: { $size: '$sales' }
                }
            },
            {
                $addFields: {
                    totalPaid: { $add: ['$totalPaidFromSales', '$totalPaidFromPayments'] },
                    totalDue: { $subtract: ['$totalAmount', { $add: ['$totalPaidFromSales', '$totalPaidFromPayments'] }] }
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

// @desc    Get customer ledger (sales & payments)
// @route   GET /api/customers/:id/ledger
// @access  Private
export const getCustomerLedger = async (req: AuthRequest, res: Response) => {
    try {
        const tenantId = req.tenantId;
        const customerId = req.params.id;
        
        const customer = await Customer.findOne({ _id: customerId, tenantId });
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        // Fetch sales
        const salesQuery: any = {
            tenantId,
            $or: [
                { customerId: customer._id }
            ]
        };

        // For backward compatibility with older records before customerId was added
        if (customer.phone) {
            salesQuery.$or.push({ customerPhone: customer.phone });
        } else {
            salesQuery.$or.push({ 
                customerName: { $regex: new RegExp(`^${customer.name}$`, 'i') },
                customerId: { $exists: false }
            });
        }

        const sales = await Sale.find(salesQuery).sort({ date: 1 }).lean();

        // Fetch payments
        const payments = await CustomerPayment.find({ tenantId, customerId }).sort({ paymentDate: 1 }).lean();

        // Merge and sort
        const ledger = [
            ...sales.map(s => {
                const dp = s.downPayment !== undefined ? s.downPayment : s.amountPaid;
                return {
                    id: s._id,
                    type: 'sale',
                    date: s.date,
                    amount: s.totalAmount,
                    paid: dp,
                    due: s.totalAmount - dp,
                    invoiceNumber: s.invoiceNumber
                };
            }),
            ...payments.map(p => ({
                id: p._id,
                type: 'payment',
                date: p.paymentDate,
                amount: p.amount,
                paymentMode: p.paymentMode,
                notes: p.notes
            }))
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Calculate running balance
        let runningBalance = 0;
        const ledgerWithBalance = ledger.map(entry => {
            if (entry.type === 'sale') {
                runningBalance += (entry.amount - ((entry as any).paid || 0));
            } else {
                runningBalance -= entry.amount;
            }
            return { ...entry, runningBalance };
        });

        res.status(200).json(ledgerWithBalance);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Add customer payment
// @route   POST /api/customers/:id/payments
// @access  Private
export const addCustomerPayment = async (req: AuthRequest, res: Response) => {
    try {
        const tenantId = req.tenantId;
        const customerId = req.params.id;
        const { amount, paymentDate, paymentMode, notes } = req.body;

        const customer = await Customer.findOne({ _id: customerId, tenantId });
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        const payment = new CustomerPayment({
            tenantId,
            customerId,
            amount,
            paymentDate: paymentDate || new Date(),
            paymentMode: paymentMode || 'cash',
            notes
        });

        await payment.save();

        // Distribute payment to oldest pending sales
        const salesQuery: any = {
            tenantId,
            status: { $in: ['pending', 'partial'] },
            $or: [
                { customerId: customer._id }
            ]
        };

        // For backward compatibility
        if (customer.phone) {
            salesQuery.$or.push({ customerPhone: customer.phone });
        } else {
            salesQuery.$or.push({ 
                customerName: { $regex: new RegExp(`^${customer.name}$`, 'i') },
                customerId: { $exists: false }
            });
        }

        const pendingSales = await Sale.find(salesQuery).sort({ date: 1 });

        let remainingPayment = amount;
        for (const sale of pendingSales) {
            if (remainingPayment <= 0) break;

            const due = sale.balanceDue;
            if (due > 0) {
                const payAmount = Math.min(due, remainingPayment);
                sale.amountPaid += payAmount;
                sale.balanceDue -= payAmount;
                remainingPayment -= payAmount;
                
                sale.status = sale.balanceDue <= 0 ? 'paid' : 'partial';
                await sale.save();
            }
        }

        res.status(201).json(payment);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};
