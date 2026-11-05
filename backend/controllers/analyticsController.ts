import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import Sale from "../models/Sale";
import mongoose from "mongoose";

export const getFastestSellingItems = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = new mongoose.Types.ObjectId(req.tenantId as string);
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const fastestSelling = await Sale.aggregate([
      {
        $match: {
          tenantId,
          date: { $gte: startDate },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: { $sum: { $multiply: ["$items.quantity", "$items.sellingPrice"] } },
          totalProfit: { $sum: { $subtract: [{ $multiply: ["$items.quantity", "$items.sellingPrice"] }, { $multiply: ["$items.quantity", "$items.purchasePriceAtTime"] }] } },
          saleCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          _id: 1,
          name: "$product.name",
          unit: "$product.unit",
          totalQuantity: 1,
          totalRevenue: 1,
          totalProfit: 1,
          saleCount: 1,
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
    ]);

    res.status(200).json(fastestSelling);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getSalesHeatmap = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = new mongoose.Types.ObjectId(req.tenantId as string);
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const heatmap = await Sale.aggregate([
      {
        $match: {
          tenantId,
          date: { $gte: startDate },
        },
      },
      {
        $project: {
          hour: { $hour: { date: "$date", timezone: "Asia/Kolkata" } },
          dayOfWeek: { $dayOfWeek: { date: "$date", timezone: "Asia/Kolkata" } },
          totalAmount: 1,
        },
      },
      {
        $group: {
          _id: { hour: "$hour", dayOfWeek: "$dayOfWeek" },
          count: { $sum: 1 },
          revenue: { $sum: "$totalAmount" },
        },
      },
      {
        $project: {
          _id: 0,
          hour: "$_id.hour",
          dayOfWeek: "$_id.dayOfWeek",
          count: 1,
          revenue: 1,
        },
      },
      { $sort: { dayOfWeek: 1, hour: 1 } },
    ]);

    // Fill missing hours/days for a complete heatmap if needed on frontend, 
    // or just return the data we have.
    res.status(200).json(heatmap);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getSalesByHour = async (req: AuthRequest, res: Response) => {
    try {
        const tenantId = new mongoose.Types.ObjectId(req.tenantId as string);
        const { days = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(days));

        const hourlyStats = await Sale.aggregate([
            {
                $match: {
                    tenantId,
                    date: { $gte: startDate },
                },
            },
            {
                $project: {
                    hour: { $hour: { date: "$date", timezone: "Asia/Kolkata" } },
                },
            },
            {
                $group: {
                    _id: "$hour",
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    hour: "$_id",
                    count: 1,
                },
            },
            { $sort: { hour: 1 } },
        ]);

        // Ensure all 24 hours are present
        const fullStats = Array.from({ length: 24 }, (_, i) => {
            const hourData = hourlyStats.find(h => h.hour === i);
            return {
                hour: i,
                count: hourData ? hourData.count : 0
            };
        });

        res.status(200).json(fullStats);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getItemSalesByDateRange = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = new mongoose.Types.ObjectId(req.tenantId as string);
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Start date and end date are required" });
    }

    // Parse boundary with explicit IST (+05:30) offset so midnight boundary matches Indian timezone on server
    const start = new Date(`${startDate}T00:00:00+05:30`);
    const end = new Date(`${endDate}T23:59:59.999+05:30`);

    const itemSales = await Sale.aggregate([
      {
        $match: {
          tenantId,
          date: { $gte: start, $lte: end },
        },
      },
      {
        $project: {
          allItems: {
            $concatArrays: [
              {
                $map: {
                  input: { $ifNull: ["$items", []] },
                  as: "i",
                  in: {
                    productId: "$$i.productId",
                    name: null,
                    unit: "$$i.unit",
                    quantity: "$$i.quantity",
                    sellingPrice: "$$i.sellingPrice",
                    purchasePrice: { $ifNull: ["$$i.purchasePriceAtTime", 0] },
                  },
                },
              },
              {
                $map: {
                  input: { $ifNull: ["$customItems", []] },
                  as: "ci",
                  in: {
                    productId: null,
                    name: "$$ci.name",
                    unit: "piece",
                    quantity: { $ifNull: ["$$ci.quantity", 1] },
                    sellingPrice: "$$ci.price",
                    purchasePrice: { $ifNull: ["$$ci.purchasePrice", 0] },
                  },
                },
              },
            ],
          },
        },
      },
      { $unwind: "$allItems" },
      {
        $group: {
          _id: {
            $ifNull: ["$allItems.productId", "$allItems.name"],
          },
          productId: { $first: "$allItems.productId" },
          customName: { $first: "$allItems.name" },
          itemUnit: { $first: "$allItems.unit" },
          totalQuantity: { $sum: "$allItems.quantity" },
          totalRevenue: { $sum: { $multiply: ["$allItems.quantity", "$allItems.sellingPrice"] } },
          totalProfit: { 
            $sum: { 
              $subtract: [
                { $multiply: ["$allItems.quantity", "$allItems.sellingPrice"] }, 
                { $multiply: ["$allItems.quantity", "$allItems.purchasePrice"] }
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          name: { $ifNull: ["$product.name", { $ifNull: ["$customName", "Custom Item"] }] },
          unit: { $ifNull: ["$product.unit", { $ifNull: ["$itemUnit", "-"] }] },
          totalQuantity: 1,
          totalRevenue: 1,
          totalProfit: 1,
        },
      },
      { $sort: { totalQuantity: -1 } },
    ]);

    res.status(200).json(itemSales);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
