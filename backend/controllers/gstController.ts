import { Request, Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/auth";
import Sale from "../models/Sale";
import Purchase from "../models/Purchase";

// @desc    Get GSTR-1 Data (Sales Breakdown)
// @route   GET /api/reports/gstr-1
export const getGSTR1 = async (req: AuthRequest, res: Response) => {
  try {
    const { month, year } = req.query;
    const tenantId = new mongoose.Types.ObjectId(req.tenantId as string);

    if (!month || !year) {
      return res.status(400).json({ message: "Month and year are required" });
    }

    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);

    const sales = await Sale.find({
      tenantId,
      date: { $gte: start, $lte: end },
    }).lean().sort({ date: 1 });

    // Categorize sales for GSTR-1
    // B2B: Business to Business (Has GSTIN)
    // B2C: Business to Consumer (No GSTIN)
    const b2b = sales.filter((s) => s.customerGSTIN && s.customerGSTIN.trim().length > 0);
    const b2c = sales.filter((s) => !s.customerGSTIN || s.customerGSTIN.trim().length === 0);

    // Calculate summaries
    const summary = {
      totalSales: sales.length,
      b2bCount: b2b.length,
      b2cCount: b2c.length,
      totalTaxableValue: sales.reduce((acc, s) => acc + (s.totalAmount - (s.taxAmount || 0)), 0),
      totalTaxAmount: sales.reduce((acc, s) => acc + (s.taxAmount || 0), 0),
      totalAmount: sales.reduce((acc, s) => acc + s.totalAmount, 0),
    };

    res.status(200).json({
      month,
      year,
      summary,
      b2b,
      b2c,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get GSTR-3B Data (Summary of Inward/Outward for tax filing)
// @route   GET /api/reports/gstr-3b
export const getGSTR3B = async (req: AuthRequest, res: Response) => {
  try {
    const { month, year } = req.query;
    const tenantId = new mongoose.Types.ObjectId(req.tenantId as string);

    if (!month || !year) {
      return res.status(400).json({ message: "Month and year are required" });
    }

    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);

    const [sales, purchases] = await Promise.all([
      Sale.find({ tenantId, date: { $gte: start, $lte: end } }).lean(),
      Purchase.find({ tenantId, date: { $gte: start, $lte: end } }).lean(),
    ]);

    // Outward supplies (Sales)
    const outwardSupplies = {
      taxableValue: sales.reduce((acc, s) => acc + (s.totalAmount - (s.taxAmount || 0)), 0),
      taxAmount: sales.reduce((acc, s) => acc + (s.taxAmount || 0), 0),
    };

    // Inward supplies (Purchases - ITC eligible)
    const inwardSupplies = {
      taxableValue: purchases.reduce((acc, p) => acc + (p.totalAmount - (p.taxAmount || 0)), 0),
      taxAmount: purchases.reduce((acc, p) => acc + (p.taxAmount || 0), 0),
    };

    res.status(200).json({
      month,
      year,
      outwardSupplies,
      inwardSupplies,
      netTaxPayable: outwardSupplies.taxAmount - inwardSupplies.taxAmount
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
