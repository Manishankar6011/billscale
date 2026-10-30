import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order';
import Product from '../models/Product';
import Tenant from '../models/Tenant';
import { AuthRequest } from '../middleware/auth';
import { broadcastToTenant, addSSEClient, removeSSEClient } from '../utils/sse';

// @desc    Place order from public catalog
// @route   POST /api/catalog/orders
// @access  Public
export const placeOrder = async (req: Request, res: Response) => {
    try {
        const { tenantId, slug, domain, customerName, customerPhone, customerAddress, items, notes, paymentMethod } = req.body;

        if (!customerName || !customerName.trim()) {
            return res.status(400).json({ message: 'Customer name is required' });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Order must contain at least one item' });
        }

        // Identify tenant
        let targetTenant: any = null;
        if (tenantId && mongoose.Types.ObjectId.isValid(tenantId)) {
            targetTenant = await Tenant.findById(tenantId);
        } else if (slug) {
            targetTenant = await Tenant.findOne({ slug: slug.toLowerCase() });
        } else if (domain) {
            targetTenant = await Tenant.findOne({ customDomain: domain.toLowerCase() });
        }

        if (!targetTenant) {
            return res.status(404).json({ message: 'Store/Tenant not found' });
        }

        // Validate products and compute total
        const productIds = items.map((i: any) => i.productId);
        const dbProducts = await Product.find({
            _id: { $in: productIds },
            tenantId: targetTenant._id
        }).lean();

        const productMap = new Map<string, any>();
        dbProducts.forEach(p => productMap.set(p._id.toString(), p));

        const orderItems = [];
        let calculatedTotal = 0;

        for (const item of items) {
            const dbProduct = productMap.get(item.productId.toString());
            if (!dbProduct) {
                return res.status(400).json({ message: `Product not found: ${item.name || item.productId}` });
            }
            const quantity = Number(item.quantity) || 1;
            const price = Number(dbProduct.pricePerUnit) || 0;
            const itemTotal = price * quantity;
            calculatedTotal += itemTotal;

            orderItems.push({
                productId: dbProduct._id,
                name: dbProduct.name,
                quantity,
                price,
                unit: dbProduct.unit || 'piece',
                mrp: dbProduct.mrp || 0,
                imageUrl: dbProduct.imageUrl || ''
            });
        }

        const count = await Order.countDocuments({ tenantId: targetTenant._id });
        const orderNumber = `ORD-${(count + 1).toString().padStart(4, '0')}`;

        const newOrder = await Order.create({
            tenantId: targetTenant._id,
            orderNumber,
            customerName: customerName.trim(),
            customerPhone: (customerPhone || '').trim(),
            customerAddress: (customerAddress || '').trim(),
            items: orderItems,
            totalAmount: calculatedTotal,
            status: 'pending',
            paymentStatus: 'unpaid',
            paymentMethod: paymentMethod === 'online' ? 'online' : 'cod',
            notes: notes || '',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Broadcast real-time notification to owner dashboard
        broadcastToTenant(targetTenant._id.toString(), 'new_order', newOrder);

        res.status(201).json({
            success: true,
            order: newOrder
        });
    } catch (err: any) {
        console.error('Error placing order:', err);
        res.status(500).json({ message: err.message || 'Server error placing order' });
    }
};

// @desc    Get tenant orders for owner dashboard
// @route   GET /api/catalog/orders
// @access  Private (Dashboard)
export const getOrders = async (req: AuthRequest, res: Response) => {
    try {
        const tenantId = new mongoose.Types.ObjectId(req.tenantId as string);
        const { status, paymentStatus } = req.query;

        const query: any = { tenantId };
        if (status && status !== 'all') {
            query.status = status;
        }
        if (paymentStatus && paymentStatus !== 'all') {
            query.paymentStatus = paymentStatus;
        }

        const orders = await Order.find(query).sort({ createdAt: -1 }).limit(100).lean();

        // Calculate Online Payment history & summary for store owner
        const allTenantOrders = await Order.find({ tenantId }).select('totalAmount paymentStatus paymentMethod createdAt').lean();
        const onlinePaidOrders = allTenantOrders.filter((o: any) => o.paymentStatus === 'paid');
        const totalOnlineAmount = onlinePaidOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
        const onlineOrdersCount = onlinePaidOrders.length;

        res.status(200).json({
            success: true,
            orders,
            onlineSummary: {
                totalAmount: totalOnlineAmount,
                count: onlineOrdersCount
            }
        });
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Failed to fetch orders' });
    }
};

// @desc    Update order status
// @route   PUT /api/catalog/orders/:id/status
// @access  Private (Dashboard)
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status, paymentStatus } = req.body;
        const tenantId = new mongoose.Types.ObjectId(req.tenantId as string);

        const order = await Order.findOne({ _id: id, tenantId });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (status) order.status = status;
        if (paymentStatus) order.paymentStatus = paymentStatus;
        order.updatedAt = new Date();

        await order.save();

        res.status(200).json({ success: true, order });
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Failed to update order' });
    }
};

// @desc    SSE stream for real-time dashboard notifications
// @route   GET /api/catalog/orders/stream
// @access  Private
export const getOrderStream = async (req: AuthRequest, res: Response) => {
    const tenantId = req.tenantId as string;
    if (!tenantId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    addSSEClient(tenantId, res);

    // Initial connection acknowledgment
    res.write(`data: ${JSON.stringify({ type: 'connected', tenantId })}\n\n`);

    // Heartbeat every 25 seconds to keep connection alive
    const intervalId = setInterval(() => {
        try {
            res.write(`: heartbeat\n\n`);
        } catch {
            clearInterval(intervalId);
        }
    }, 25000);

    req.on('close', () => {
        clearInterval(intervalId);
        removeSSEClient(tenantId, res);
    });
};
