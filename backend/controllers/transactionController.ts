import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Sale from '../models/Sale';
import Purchase from '../models/Purchase';
import Product from '../models/Product';
import Customer from '../models/Customer';
import mongoose from 'mongoose';

// @desc    Get all sales
// @route   GET /api/transactions/sales
export const getSales = async (req: AuthRequest, res: Response) => {
    try {
        const sales = await Sale.find({ tenantId: req.tenantId }).populate('items.productId', 'name unit');
        res.status(200).json(sales);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Process a new sale (decreases stock)
// @route   POST /api/transactions/sales
export const processSale = async (req: AuthRequest, res: Response) => {
    const { 
        customerName, 
        customerPhone, 
        customerAddress,
        items, 
        additionalItems, 
        paymentMode, 
        status, 
        date 
    } = req.body;
    
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        let totalAmount = 0;
        let totalProfit = 0;
        const processedItems = [];

        // 1. Handle Customer Auto-Creation/Linking
        if (customerPhone) {
            const existingCustomer = await Customer.findOne({ 
                tenantId: req.tenantId, 
                phone: customerPhone 
            }).session(session);

            if (!existingCustomer) {
                const newCustomer = new Customer({
                    tenantId: req.tenantId,
                    name: customerName,
                    phone: customerPhone,
                    address: customerAddress
                });
                await newCustomer.save({ session });
            }
        }

        for (const item of items) {
            if (Number(item.quantity) <= 0) throw new Error(`Invalid quantity for item`);
            if (Number(item.sellingPrice) < 0) throw new Error(`Invalid selling price for item`);

            const product = await Product.findOne({ _id: item.productId, tenantId: req.tenantId }).session(session);
            if (!product) throw new Error(`Product ${item.productId} not found`);
            
            const conversionFactor = Number(item.conversionFactor) || 1;
            const baseQtyToDeduct = Number(item.quantity) / conversionFactor;

            if (product.stock < baseQtyToDeduct) throw new Error(`Insufficient stock for ${product.name}`);

            const itemTotal = Number(item.quantity) * Number(item.sellingPrice);
            const itemProfit = itemTotal - (product.purchasePrice * baseQtyToDeduct);

            totalAmount += itemTotal;
            totalProfit += itemProfit;

            processedItems.push({
                productId: item.productId,
                quantity: Number(item.quantity),
                unit: item.unit || product.unit,
                conversionFactor: conversionFactor,
                sellingPrice: Number(item.sellingPrice),
                purchasePriceAtTime: product.purchasePrice,
                mrpAtTime: product.mrp || 0
            });

            // Update Product Stock
            product.stock -= baseQtyToDeduct;
            await product.save({ session });
        }

        // Add additional items to totalAmount
        if (additionalItems && Array.isArray(additionalItems)) {
            for (const item of additionalItems) {
                totalAmount += Number(item.price);
                totalProfit += Number(item.price);
            }
        }

        const invoiceNumber = `INV-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;

        const sale = new Sale({
            tenantId: req.tenantId,
            customerName,
            customerPhone,
            customerAddress,
            invoiceNumber,
            items: processedItems,
            additionalItems: additionalItems || [],
            totalAmount,
            totalProfit,
            paymentMode,
            status,
            date: date || new Date()
        });

        await sale.save({ session });

        await session.commitTransaction();
        res.status(201).json(sale);
    } catch (err: any) {
        await session.abortTransaction();
        res.status(400).json({ message: err.message });
    } finally {
        session.endSession();
    }
};

// @desc    Get all purchases
// @route   GET /api/transactions/purchases
export const getPurchases = async (req: AuthRequest, res: Response) => {
    try {
        const purchases = await Purchase.find({ tenantId: req.tenantId }).populate('productId', 'name unit');
        res.status(200).json(purchases);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Process a new purchase (increases stock)
// @route   POST /api/transactions/purchases
export const processPurchase = async (req: AuthRequest, res: Response) => {
    const { supplierName, productId, quantity, purchasePrice, paymentStatus, date } = req.body;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        if (Number(quantity) <= 0) throw new Error('Quantity must be greater than 0');
        if (Number(purchasePrice) < 0) throw new Error('Purchase price cannot be negative');

        const totalAmount = quantity * purchasePrice;

        const purchase = new Purchase({
            tenantId: req.tenantId,
            supplierName,
            productId,
            quantity,
            purchasePrice,
            totalAmount,
            paymentStatus,
            date
        });

        // Update Product Stock
        const product = await Product.findOne({ _id: productId, tenantId: req.tenantId }).session(session);
        if (!product) throw new Error('Product not found');

        product.stock += Number(quantity);
        product.purchasePrice = Number(purchasePrice); // Sync cost price
        await product.save({ session });
        await purchase.save({ session });

        await session.commitTransaction();
        res.status(201).json(purchase);
    } catch (err: any) {
        await session.abortTransaction();
        res.status(400).json({ message: err.message });
    } finally {
        session.endSession();
    }
};

// @desc    Update a purchase (syncs stock)
// @route   PUT /api/transactions/purchases/:id
export const updatePurchase = async (req: AuthRequest, res: Response) => {
    const { supplierName, productId, quantity, purchasePrice, paymentStatus, date } = req.body;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const oldPurchase = await Purchase.findOne({ _id: req.params.id, tenantId: req.tenantId }).session(session);
        if (!oldPurchase) throw new Error('Purchase not found');

        // 1. Revert Old Stock
        const oldProduct = await Product.findOne({ _id: oldPurchase.productId, tenantId: req.tenantId }).session(session);
        if (oldProduct) {
            oldProduct.stock -= Number(oldPurchase.quantity);
            await oldProduct.save({ session });
        }

        // 2. Apply New Stock
        const newProduct = await Product.findOne({ _id: productId, tenantId: req.tenantId }).session(session);
        if (!newProduct) throw new Error('New product not found');
        
        newProduct.stock += Number(quantity);
        newProduct.purchasePrice = Number(purchasePrice); // Sync cost price
        await newProduct.save({ session });

        // 3. Update Purchase Record
        oldPurchase.supplierName = supplierName;
        oldPurchase.productId = productId;
        oldPurchase.quantity = quantity;
        oldPurchase.purchasePrice = purchasePrice;
        oldPurchase.totalAmount = quantity * purchasePrice;
        oldPurchase.paymentStatus = paymentStatus;
        oldPurchase.date = date;

        await oldPurchase.save({ session });

        await session.commitTransaction();
        res.json(oldPurchase);
    } catch (err: any) {
        await session.abortTransaction();
        res.status(400).json({ message: err.message });
    } finally {
        session.endSession();
    }
};

// @desc    Delete a purchase (reverts stock)
// @route   DELETE /api/transactions/purchases/:id
export const deletePurchase = async (req: AuthRequest, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const purchase = await Purchase.findOne({ _id: req.params.id, tenantId: req.tenantId }).session(session);
        if (!purchase) throw new Error('Purchase not found');

        // Revert Stock
        const product = await Product.findOne({ _id: purchase.productId, tenantId: req.tenantId }).session(session);
        if (product) {
            product.stock -= Number(purchase.quantity);
            await product.save({ session });
        }

        await Purchase.deleteOne({ _id: req.params.id, tenantId: req.tenantId }).session(session);

        await session.commitTransaction();
        res.json({ message: 'Purchase deleted and stock reverted' });
    } catch (err: any) {
        await session.abortTransaction();
        res.status(400).json({ message: err.message });
    } finally {
        session.endSession();
    }
};
