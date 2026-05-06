import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import Purchase from "../models/Purchase";
import Product from "../models/Product";
import mongoose from "mongoose";

// @desc    Create new purchase
// @route   POST /api/purchases
export const createPurchase = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      supplierName,
      supplierGSTIN,
      supplierPhone,
      supplierAddress,
      billNumber,
      items,
      totalAmount,
      taxAmount,
      discount,
      paymentMode,
      paymentStatus,
      date,
    } = req.body;

    const processedItems = [];

    for (const item of items) {
      if (Number(item.quantity) <= 0)
        throw new Error(`Invalid quantity for item`);
      if (Number(item.purchasePrice) < 0)
        throw new Error(`Invalid purchase price for item`);

      const product = await Product.findOne({
        _id: item.productId,
        tenantId: req.tenantId,
      }).session(session);
      if (!product) throw new Error(`Product ${item.productId} not found`);

      processedItems.push({
        productId: item.productId,
        name: item.name || product.name,
        quantity: Number(item.quantity),
        unit: item.unit || product.unit,
        purchasePrice: Number(item.purchasePrice),
        taxRate: Number(item.taxRate) || 0,
        taxAmount: Number(item.taxAmount) || 0,
        hsnCode: item.hsnCode || product.hsnCode || "",
      });

      // Update Product Stock and Purchase Price
      // We increase stock when we purchase
      product.stock += Number(item.quantity);
      
      // Optionally update the master purchase price to the latest purchase price
      product.purchasePrice = Number(item.purchasePrice);
      
      await product.save({ session });
    }

    const newPurchase = new Purchase({
      tenantId: req.tenantId,
      supplierName,
      supplierGSTIN,
      supplierPhone,
      supplierAddress,
      billNumber,
      items: processedItems,
      totalAmount,
      taxAmount,
      discount,
      paymentMode: paymentMode || 'cash',
      paymentStatus: paymentStatus || 'paid',
      date: date || new Date(),
    });

    await newPurchase.save({ session });

    await session.commitTransaction();
    res.status(201).json(newPurchase);
  } catch (error: any) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Get all purchases (with filters)
// @route   GET /api/purchases
export const getPurchases = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const { startDate, endDate, supplierName } = req.query;

    let query: any = { tenantId };

    if (supplierName) {
      query.supplierName = { $regex: supplierName as string, $options: 'i' };
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const start = new Date(startDate as string);
        start.setHours(0, 0, 0, 0);
        query.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [purchases, totalCount] = await Promise.all([
      Purchase.find(query)
        .populate("items.productId", "name unit")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      Purchase.countDocuments(query),
    ]);

    res.status(200).json({
      purchases,
      pagination: {
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        limit,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete purchase (Rollback stock)
// @route   DELETE /api/purchases/:id
export const deletePurchase = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const purchase = await Purchase.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    }).session(session);

    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    // Rollback stock (Decrease stock because this purchase is being cancelled)
    for (const item of purchase.items) {
      const product = await Product.findOne({
        _id: item.productId,
        tenantId: req.tenantId,
      }).session(session);

      if (product) {
        product.stock -= item.quantity;
        await product.save({ session });
      }
    }

    await Purchase.deleteOne({ _id: purchase._id }).session(session);

    await session.commitTransaction();
    res.status(200).json({ message: "Purchase deleted and stock updated" });
  } catch (error: any) {
    await session.abortTransaction();
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
};
