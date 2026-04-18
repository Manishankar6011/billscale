import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Sale from '../models/Sale';
import Purchase from '../models/Purchase';
import Product from '../models/Product';
import Customer from '../models/Customer';
import Tenant from '../models/Tenant';
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
        date,
        amountPaid,
        roundOffAmount
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

        // Apply Round Off if provided
        const finalRoundOff = Number(roundOffAmount) || 0;
        totalAmount += finalRoundOff;

        const finalAmountPaid = Number(amountPaid) || 0;
        const balanceDue = totalAmount - finalAmountPaid;

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
            amountPaid: finalAmountPaid,
            balanceDue: balanceDue,
            roundOffAmount: finalRoundOff,
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

        // 1. Find the selected product
        const originalProduct = await Product.findOne({ _id: productId, tenantId: req.tenantId }).session(session);
        if (!originalProduct) throw new Error('Product not found');

        let targetProduct = originalProduct;

        // 2. If price differs, find or create a new batch
        if (Number(purchasePrice) !== originalProduct.purchasePrice) {
            const existingBatch = await Product.findOne({
                tenantId: req.tenantId,
                name: originalProduct.name,
                purchasePrice: Number(purchasePrice)
            }).session(session);

            if (existingBatch) {
                targetProduct = existingBatch;
            } else {
                // Create a new batch/product entry
                const count = await Product.countDocuments({ 
                    tenantId: req.tenantId, 
                    name: originalProduct.name 
                }).session(session);

                targetProduct = new Product({
                    tenantId: req.tenantId,
                    name: originalProduct.name,
                    category: originalProduct.category,
                    unit: originalProduct.unit,
                    barcode: originalProduct.barcode,
                    pricePerUnit: originalProduct.pricePerUnit, // Default to same selling price
                    mrp: originalProduct.mrp,
                    purchasePrice: Number(purchasePrice),
                    stock: 0, // Will be updated below
                    batchNumber: `Batch ${count + 1}`,
                    minStockAlert: originalProduct.minStockAlert
                });
                await targetProduct.save({ session });
            }
        }

        // 3. Create Purchase Record linked to the target batch
        const purchase = new Purchase({
            tenantId: req.tenantId,
            supplierName,
            productId: targetProduct._id,
            quantity,
            purchasePrice,
            totalAmount,
            paymentStatus,
            date
        });

        // 4. Update Target Product Stock
        targetProduct.stock += Number(quantity);
        targetProduct.purchasePrice = Number(purchasePrice); // Ensure it's set
        await targetProduct.save({ session });
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

        // 1. Revert Old Stock from the ORIGINAL product ID
        const oldProduct = await Product.findOne({ _id: oldPurchase.productId, tenantId: req.tenantId }).session(session);
        if (oldProduct) {
            oldProduct.stock -= Number(oldPurchase.quantity);
            await oldProduct.save({ session });
        }

        // 2. Identify Target Product for new state
        const selectedProduct = await Product.findOne({ _id: productId, tenantId: req.tenantId }).session(session);
        if (!selectedProduct) throw new Error('Selected product not found');

        let targetProduct = selectedProduct;

        // Check if price matches selectedProduct. If not, find or create the correct batch
        if (Number(purchasePrice) !== selectedProduct.purchasePrice) {
            const existingBatch = await Product.findOne({
                tenantId: req.tenantId,
                name: selectedProduct.name,
                purchasePrice: Number(purchasePrice)
            }).session(session);

            if (existingBatch) {
                targetProduct = existingBatch;
            } else {
                const count = await Product.countDocuments({ 
                    tenantId: req.tenantId, 
                    name: selectedProduct.name 
                }).session(session);

                targetProduct = new Product({
                    tenantId: req.tenantId,
                    name: selectedProduct.name,
                    category: selectedProduct.category,
                    unit: selectedProduct.unit,
                    barcode: selectedProduct.barcode,
                    pricePerUnit: selectedProduct.pricePerUnit,
                    mrp: selectedProduct.mrp,
                    purchasePrice: Number(purchasePrice),
                    stock: 0,
                    batchNumber: `Batch ${count + 1}`,
                    minStockAlert: selectedProduct.minStockAlert
                });
                await targetProduct.save({ session });
            }
        }

        // 3. Apply New Stock
        targetProduct.stock += Number(quantity);
        await targetProduct.save({ session });

        // 4. Update Purchase Record
        oldPurchase.supplierName = supplierName;
        oldPurchase.productId = targetProduct._id; // Switch to the new target batch ID if changed
        oldPurchase.quantity = Number(quantity);
        oldPurchase.purchasePrice = Number(purchasePrice);
        oldPurchase.totalAmount = Number(quantity) * Number(purchasePrice);
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
// @desc    Get sale by ID for public invoice viewing (No Auth)
// @route   GET /api/transactions/public-sale/:id
export const getPublicSale = async (req: Request, res: Response) => {
    try {
        const sale = await Sale.findById(req.params.id)
            .populate('items.productId', 'name unit')
            .populate('tenantId', 'companyName phone address email');
            
        if (!sale) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        res.status(200).json(sale);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};
