import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import Sale from "../models/Sale";
import Purchase from "../models/Purchase";
import Product from "../models/Product";
import Customer from "../models/Customer";
import Tenant from "../models/Tenant";
import mongoose from "mongoose";

// @desc    Get all sales
// @route   GET /api/transactions/sales
// @desc    Get all sales (Paginated)
// @route   GET /api/transactions/sales
export const getSales = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const search = req.query.search as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const status = req.query.status as string;
    const saleType = req.query.saleType as string;

    const tenantId = new mongoose.Types.ObjectId(req.tenantId as string);
    let query: any = { tenantId };

    if (status && status !== "all") {
      if (status === "unpaid") {
        query.status = { $in: ["pending", "partial"] };
      } else {
        query.status = status;
      }
    }

    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: "i" } },
        { invoiceNumber: { $regex: search, $options: "i" } },
        { customerPhone: { $regex: search, $options: "i" } },
      ];
    }

    if (saleType === "direct") {
      const directCondition = {
        $or: [
          { "customItems.0": { $exists: true } },
          { "additionalItems.0": { $exists: true } },
        ],
      };
      if (query.$or) {
        query.$and = [{ $or: query.$or }, directCondition];
        delete query.$or;
      } else {
        query.$or = directCondition.$or;
      }
    } else if (saleType === "inventory") {
      query["items.0"] = { $exists: true };
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const summaryQuery = { ...query };
    delete summaryQuery.status;

    const [sales, totalCount, totals] = await Promise.all([
      Sale.find(query)
        .populate("items.productId", "name unit mrp purchasePrice hasSubUnit subUnitName subUnitValue subUnitMrp subUnitPurchasePrice subUnitSalePrice")
        .populate("createdBy", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Sale.countDocuments(query),
      Sale.aggregate([
        { $match: summaryQuery },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$totalAmount" },
            totalPaid: { $sum: "$amountPaid" },
            totalUnpaid: { $sum: "$balanceDue" },
            totalProfit: { $sum: "$totalProfit" },
            totalAdditionalCharges: {
              $sum: { $sum: "$additionalItems.price" },
            },
            totalRoundOff: { $sum: "$roundOffAmount" },
            paidCount: {
              $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] },
            },
            pendingCount: {
              $sum: {
                $cond: [{ $in: ["$status", ["pending", "partial"]] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    res.status(200).json({
      sales,
      pagination: {
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        limit,
      },
      summary: totals[0] || {
        totalAmount: 0,
        totalPaid: 0,
        totalUnpaid: 0,
        totalProfit: 0,
        totalAdditionalCharges: 0,
        totalRoundOff: 0,
      },
    });
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
    customItems,
    paymentMode,
    status,
    date,
    amountPaid,
    roundOffAmount,
    showQRCode,
    customerGSTIN,
    customerState,
    customerStateCode,
  } = req.body;

  let session: any;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    // 0. Check Subscription Limits for Free Plan
    const tenant = await Tenant.findById(req.tenantId).session(session);
    if (!tenant) throw new Error("Unauthorized or Business not found");

    if (tenant.planType === "free") {
      const startOfMonth = new Date();
      startOfMonth.setHours(0, 0, 0, 0);
      startOfMonth.setDate(1);

      const billsCount = await Sale.countDocuments({
        tenantId: req.tenantId,
        date: { $gte: startOfMonth },
      });

      if (billsCount >= 50) {
        return res.status(403).json({
          message:
            "Monthly bill limit (50) reached for Free Starter plan. Please upgrade to create more bills.",
        });
      }
    }

    let totalAmount = 0;
    let totalProfit = 0;
    let totalTaxAmount = 0;
    const processedItems = [];

    // 1. Handle Customer Auto-Creation/Linking
    let finalCustomerId = req.body.customerId || null;

    if (!finalCustomerId && (customerPhone || customerName)) {
      let existingCustomer;
      if (customerPhone) {
        existingCustomer = await Customer.findOne({
          tenantId: req.tenantId,
          phone: customerPhone,
        }).session(session);
      } else {
        // Match by name if phone is missing
        existingCustomer = await Customer.findOne({
          tenantId: req.tenantId,
          name: customerName,
          $or: [{ phone: "" }, { phone: { $exists: false } }, { phone: null }],
        }).session(session);
      }

      if (!existingCustomer && customerName) {
        const newCustomer = new Customer({
          tenantId: req.tenantId,
          name: customerName,
          phone: customerPhone || undefined,
          address: customerAddress,
          gstin: customerGSTIN,
          state: customerState,
          stateCode: customerStateCode,
        });
        await newCustomer.save({ session });
        finalCustomerId = newCustomer._id;
      } else if (existingCustomer) {
        finalCustomerId = existingCustomer._id;
      }
    }

    // Fetch all products in one go to prevent N+1 queries
    const productIds = items.map((i: any) => i.productId);
    const products = await Product.find({
      _id: { $in: productIds },
      tenantId: req.tenantId,
    }).session(session);

    const productMap = new Map();
    products.forEach((p) => productMap.set(p._id.toString(), p));

    const bulkOperations = [];

    for (const item of items) {
      if (Number(item.quantity) <= 0)
        throw new Error(`Invalid quantity for item`);
      if (Number(item.sellingPrice) < 0)
        throw new Error(`Invalid selling price for item`);

      const product = productMap.get(item.productId.toString());
      if (!product) throw new Error(`Product ${item.productId} not found`);

      const conversionFactor = Number(item.conversionFactor) || 1;
      const baseQtyToDeduct = Number(item.quantity) / conversionFactor;

      if (product.stock < baseQtyToDeduct)
        throw new Error(`Insufficient stock for ${product.name}`);

      const itemTotal = Number(item.quantity) * Number(item.sellingPrice);
      const itemProfit = itemTotal - product.purchasePrice * baseQtyToDeduct;

      const itemTaxRate = Number(item.taxRate) || 0;
      const itemTaxAmount = Number(item.taxAmount) || 0;

      totalAmount += itemTotal;
      totalProfit += itemProfit;
      totalTaxAmount += itemTaxAmount;

      processedItems.push({
        productId: item.productId,
        quantity: Number(item.quantity),
        unit: item.unit || product.unit,
        conversionFactor: conversionFactor,
        sellingPrice: Number(item.sellingPrice),
        purchasePriceAtTime: item.purchasePriceAtTime !== undefined ? item.purchasePriceAtTime : product.purchasePrice,
        mrpAtTime: item.mrpAtTime !== undefined ? item.mrpAtTime : (product.mrp || 0),
        taxRate: itemTaxRate,
        taxAmount: itemTaxAmount,
        hsnCode: item.hsnCode || product.hsnCode || "",
      });

      // Update in-memory stock for any duplicate item validation
      product.stock -= baseQtyToDeduct;

      bulkOperations.push({
        updateOne: {
          filter: { _id: product._id },
          update: { $inc: { stock: -baseQtyToDeduct } },
        },
      });
    }

    if (bulkOperations.length > 0) {
      await Product.bulkWrite(bulkOperations, { session });
    }

    // Add additional items to totalAmount & calculate Profit contribution
    if (additionalItems && Array.isArray(additionalItems)) {
      for (const item of additionalItems) {
        const chargePrice = Number(item.price) || 0;
        const profitPercent = Number(item.profitPercent) || 0;
        const purchasePrice = Number(item.purchasePrice) || 0;
        const profitAmount = Number(item.profitAmount) || 0;
        
        totalAmount += chargePrice;
        if (purchasePrice > 0) {
          totalProfit += (chargePrice - purchasePrice);
        } else if (profitAmount > 0) {
          totalProfit += profitAmount;
        } else {
          totalProfit += (chargePrice * profitPercent) / 100;
        }
      }
    }

    // Add custom direct-sale items to totalAmount & totalProfit
    if (customItems && Array.isArray(customItems)) {
      for (const item of customItems) {
        const customPrice = Number(item.price) || 0;
        const customQuantity = Number(item.quantity) || 1;
        const lineTotal = customPrice * customQuantity;
        const profitPercent = Number(item.profitPercent) || 0;
        const purchasePrice = Number(item.purchasePrice) || 0;
        const profitAmount = Number(item.profitAmount) || 0;

        totalAmount += lineTotal;
        if (purchasePrice > 0) {
          totalProfit += (customPrice - purchasePrice) * customQuantity;
        } else if (profitAmount > 0) {
          totalProfit += profitAmount * customQuantity;
        } else {
          totalProfit += (lineTotal * profitPercent) / 100;
        }
      }
    }

    // Apply Round Off if provided
    const finalRoundOff = Number(roundOffAmount) || 0;
    totalAmount += finalRoundOff;

    const finalAmountPaid = Number(amountPaid) || 0;
    const balanceDue = totalAmount - finalAmountPaid;

    // Auto-calculate status based on balance
    let calculatedStatus = status;
    if (balanceDue <= 0) {
      calculatedStatus = "paid";
    } else if (finalAmountPaid > 0) {
      calculatedStatus = "partial";
    } else {
      calculatedStatus = "pending";
    }

    const currentInvoiceNum = tenant.nextInvoiceNumber || 1;
    const invoiceNumber = `INV-${currentInvoiceNum}`;

    const sale = new Sale({
      tenantId: req.tenantId,
      customerId: finalCustomerId,
      customerName,
      customerPhone,
      customerAddress,
      customerGSTIN: customerGSTIN || "",
      customerState: customerState || "",
      customerStateCode: customerStateCode || "",
      invoiceNumber,
      items: processedItems,
      additionalItems: additionalItems || [],
      customItems: customItems || [],
      totalAmount,
      totalProfit,
      taxAmount: totalTaxAmount,
      amountPaid: finalAmountPaid,
      downPayment: finalAmountPaid,
      balanceDue: balanceDue,
      roundOffAmount: finalRoundOff,
      paymentMode,
      status: calculatedStatus,
      date: date ? new Date(date) : new Date(),
      showQRCode: !!showQRCode,
      createdBy: req.user?._id,
    });

    await sale.save({ session });

    // Increment Invoice Number
    tenant.nextInvoiceNumber = currentInvoiceNum + 1;
    await tenant.save({ session });

    await sale.populate("items.productId", "name unit mrp purchasePrice hasSubUnit subUnitName subUnitValue subUnitMrp subUnitPurchasePrice subUnitSalePrice");
    await session.commitTransaction();
    res.status(201).json(sale);
  } catch (err: any) {
    await session.abortTransaction();
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
};

// @desc    Update a sale (syncs stock)
// @route   PUT /api/transactions/sales/:id
export const updateSale = async (req: AuthRequest, res: Response) => {
  const {
    customerName,
    customerPhone,
    customerAddress,
    items,
    additionalItems,
    customItems,
    paymentMode,
    status,
    date,
    amountPaid,
    roundOffAmount,
    showQRCode,
    customerGSTIN,
    customerState,
    customerStateCode,
  } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const oldSale = await Sale.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    }).session(session);
    if (!oldSale) throw new Error("Sale not found");

    // Fetch all relevant products (from old sale and new items)
    const oldProductIds = oldSale.items.map((i: any) => i.productId.toString());
    const newProductIds = items.map((i: any) => i.productId.toString());
    const allProductIds = [...new Set([...oldProductIds, ...newProductIds])];

    const products = await Product.find({
      _id: { $in: allProductIds },
      tenantId: req.tenantId,
    }).session(session);

    const productMap = new Map();
    products.forEach((p) => productMap.set(p._id.toString(), p));

    const bulkOperations = [];

    // 1. Revert Old Stock
    for (const item of oldSale.items) {
      const product = productMap.get(item.productId.toString());
      if (product) {
        const factor = item.conversionFactor || 1;
        const qtyToAdd = item.quantity / factor;
        product.stock += qtyToAdd;

        bulkOperations.push({
          updateOne: {
            filter: { _id: product._id },
            update: { $inc: { stock: qtyToAdd } },
          },
        });
      }
    }

    let totalAmount = 0;
    let totalProfit = 0;
    let totalTaxAmount = 0;
    const processedItems = [];

    // 2. Handle Customer
    let finalCustomerId = req.body.customerId || null;

    if (!finalCustomerId && (customerPhone || customerName)) {
      let existingCustomer;
      if (customerPhone) {
        existingCustomer = await Customer.findOne({
          tenantId: req.tenantId,
          phone: customerPhone,
        }).session(session);
      } else {
        existingCustomer = await Customer.findOne({
          tenantId: req.tenantId,
          name: customerName,
          $or: [{ phone: "" }, { phone: { $exists: false } }, { phone: null }],
        }).session(session);
      }

      if (!existingCustomer && customerName) {
        const newCustomer = new Customer({
          tenantId: req.tenantId,
          name: customerName,
          phone: customerPhone || undefined,
          address: customerAddress,
        });
        await newCustomer.save({ session });
        finalCustomerId = newCustomer._id;
      } else if (existingCustomer) {
        finalCustomerId = existingCustomer._id;
      }
    }

    // 3. Process New Items & Deduct Stock
    for (const item of items) {
      if (Number(item.quantity) <= 0)
        throw new Error(`Invalid quantity for item`);

      const product = productMap.get(item.productId.toString());
      if (!product) throw new Error(`Product ${item.productId} not found`);

      const conversionFactor = Number(item.conversionFactor) || 1;
      const baseQtyToDeduct = Number(item.quantity) / conversionFactor;

      if (product.stock < baseQtyToDeduct)
        throw new Error(`Insufficient stock for ${product.name}`);

      const itemTotal = Number(item.quantity) * Number(item.sellingPrice);
      const itemProfit = itemTotal - product.purchasePrice * baseQtyToDeduct;

      const itemTaxRate = Number(item.taxRate) || 0;
      const itemTaxAmount = Number(item.taxAmount) || 0;

      totalAmount += itemTotal;
      totalProfit += itemProfit;
      totalTaxAmount += itemTaxAmount;

      processedItems.push({
        productId: item.productId,
        quantity: Number(item.quantity),
        unit: item.unit || product.unit,
        conversionFactor: conversionFactor,
        sellingPrice: Number(item.sellingPrice),
        purchasePriceAtTime: item.purchasePriceAtTime !== undefined ? item.purchasePriceAtTime : product.purchasePrice,
        mrpAtTime: item.mrpAtTime !== undefined ? item.mrpAtTime : (product.mrp || 0),
        taxRate: itemTaxRate,
        taxAmount: itemTaxAmount,
        hsnCode: item.hsnCode || product.hsnCode || "",
      });

      product.stock -= baseQtyToDeduct;
      bulkOperations.push({
        updateOne: {
          filter: { _id: product._id },
          update: { $inc: { stock: -baseQtyToDeduct } },
        },
      });
    }

    if (bulkOperations.length > 0) {
      await Product.bulkWrite(bulkOperations, { session });
    }

    if (additionalItems && Array.isArray(additionalItems)) {
      for (const item of additionalItems) {
        const chargePrice = Number(item.price) || 0;
        const profitPercent = Number(item.profitPercent) || 0;
        const purchasePrice = Number(item.purchasePrice) || 0;
        const profitAmount = Number(item.profitAmount) || 0;

        totalAmount += chargePrice;
        if (purchasePrice > 0) {
          totalProfit += (chargePrice - purchasePrice);
        } else if (profitAmount > 0) {
          totalProfit += profitAmount;
        } else {
          totalProfit += (chargePrice * profitPercent) / 100;
        }
      }
    }

    if (customItems && Array.isArray(customItems)) {
      for (const item of customItems) {
        const customPrice = Number(item.price) || 0;
        const customQuantity = Number(item.quantity) || 1;
        const lineTotal = customPrice * customQuantity;
        const profitPercent = Number(item.profitPercent) || 0;
        const purchasePrice = Number(item.purchasePrice) || 0;
        const profitAmount = Number(item.profitAmount) || 0;

        totalAmount += lineTotal;
        if (purchasePrice > 0) {
          totalProfit += (customPrice - purchasePrice) * customQuantity;
        } else if (profitAmount > 0) {
          totalProfit += profitAmount * customQuantity;
        } else {
          totalProfit += (lineTotal * profitPercent) / 100;
        }
      }
    }

    const finalRoundOff = Number(roundOffAmount) || 0;
    totalAmount += finalRoundOff;
    const finalAmountPaid = Number(amountPaid) || 0;
    const balanceDue = totalAmount - finalAmountPaid;

    let calculatedStatus = status;
    if (balanceDue <= 0) calculatedStatus = "paid";
    else if (finalAmountPaid > 0) calculatedStatus = "partial";
    else calculatedStatus = "pending";

    // Update Sale
    if (finalCustomerId) oldSale.customerId = finalCustomerId;
    oldSale.customerName = customerName;
    oldSale.customerPhone = customerPhone;
    oldSale.customerAddress = customerAddress;
    oldSale.customerGSTIN = customerGSTIN || oldSale.customerGSTIN;
    oldSale.customerState = customerState || oldSale.customerState;
    oldSale.customerStateCode = customerStateCode || oldSale.customerStateCode;
    oldSale.items = processedItems;
    oldSale.additionalItems = additionalItems || [];
    oldSale.customItems = customItems || [];
    oldSale.totalAmount = totalAmount;
    oldSale.totalProfit = totalProfit;
    oldSale.taxAmount = totalTaxAmount;
    oldSale.amountPaid = finalAmountPaid;
    oldSale.downPayment = finalAmountPaid;
    oldSale.balanceDue = balanceDue;
    oldSale.roundOffAmount = finalRoundOff;
    oldSale.paymentMode = paymentMode;
    oldSale.status = calculatedStatus;
    oldSale.date = date ? new Date(date) : oldSale.date;
    oldSale.showQRCode = !!showQRCode;
    if (!oldSale.createdBy) oldSale.createdBy = req.user?._id;

    await oldSale.save({ session });

    await oldSale.populate("items.productId", "name unit mrp purchasePrice hasSubUnit subUnitName subUnitValue subUnitMrp subUnitPurchasePrice subUnitSalePrice");
    await session.commitTransaction();
    res.json(oldSale);
  } catch (err: any) {
    await session.abortTransaction();
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
};

// @desc    Delete a sale (reverts stock)
// @route   DELETE /api/transactions/sales/:id
export const deleteSale = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await Sale.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    }).session(session);
    if (!sale) throw new Error("Sale not found");

    // Revert Stock
    const productIds = sale.items.map((i: any) => i.productId.toString());
    const products = await Product.find({
      _id: { $in: productIds },
      tenantId: req.tenantId,
    }).session(session);

    const productMap = new Map();
    products.forEach((p) => productMap.set(p._id.toString(), p));

    const bulkOperations = [];

    for (const item of sale.items) {
      const product = productMap.get(item.productId.toString());
      if (product) {
        const factor = item.conversionFactor || 1;
        const qtyToAdd = item.quantity / factor;
        bulkOperations.push({
          updateOne: {
            filter: { _id: product._id },
            update: { $inc: { stock: qtyToAdd } },
          },
        });
      }
    }

    if (bulkOperations.length > 0) {
      await Product.bulkWrite(bulkOperations, { session });
    }

    await Sale.deleteOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    }).session(session);

    await session.commitTransaction();
    res.json({ message: "Sale deleted and stock reverted" });
  } catch (err: any) {
    await session.abortTransaction();
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
};

// @desc    Get all purchases
// @route   GET /api/transactions/purchases
// @desc    Get all purchases (Paginated)
// @route   GET /api/transactions/purchases
export const getPurchases = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const { startDate, endDate, search } = req.query;
    const tenantId = new mongoose.Types.ObjectId(req.tenantId as string);
    let query: any = { tenantId };

    if (search) {
      query.supplierName = { $regex: search as string, $options: "i" };
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

    const [purchases, totalCount] = await Promise.all([
      Purchase.find(query)
        .populate("items.productId", "name unit mrp purchasePrice hasSubUnit subUnitName subUnitValue subUnitMrp subUnitPurchasePrice subUnitSalePrice")
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
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Process a new purchase (increases stock)
// @route   POST /api/transactions/purchases
export const processPurchase = async (req: AuthRequest, res: Response) => {
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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("At least one item is required");
    }

    const processedItems = [];
    
    // Pre-fetch all original products
    const productIds = items.map((i: any) => i.productId.toString());
    const originalProducts = await Product.find({
      _id: { $in: productIds },
      tenantId: req.tenantId,
    }).session(session);

    const originalProductMap = new Map();
    originalProducts.forEach((p) => originalProductMap.set(p._id.toString(), p));

    const bulkOperations = [];

    for (const item of items) {
      const { productId, quantity, purchasePrice, sellingPrice, mrp, name, unit, conversionFactor = 1, taxRate, taxAmount: itemTaxAmount, hsnCode } = item;

      if (Number(quantity) <= 0)
        throw new Error(`Quantity for ${name || 'item'} must be greater than 0`);
      if (Number(purchasePrice) < 0)
        throw new Error(`Purchase price for ${name || 'item'} cannot be negative`);

      // 1. Find the selected product from memory
      const originalProduct = originalProductMap.get(productId.toString());
      if (!originalProduct) throw new Error(`Product not found: ${productId}`);

      let targetProduct = originalProduct;
      let isNewBatch = false;

      // 2. If price/mrp/sellingPrice differs, find or create a new batch
      const numPurchasePrice = Number(purchasePrice);
      const numSellingPrice = sellingPrice !== undefined ? Number(sellingPrice) : originalProduct.pricePerUnit;
      const numMRP = mrp !== undefined ? Number(mrp) : originalProduct.mrp;
      const numConversionFactor = Number(conversionFactor) || 1;

      if (
        numPurchasePrice !== originalProduct.purchasePrice ||
        (sellingPrice !== undefined && numSellingPrice !== originalProduct.pricePerUnit) ||
        (mrp !== undefined && numMRP !== originalProduct.mrp)
      ) {
        const existingBatch = await Product.findOne({
          tenantId: req.tenantId,
          name: originalProduct.name,
          purchasePrice: numPurchasePrice,
          pricePerUnit: numSellingPrice,
          mrp: numMRP,
        }).session(session);

        if (existingBatch) {
          targetProduct = existingBatch;
        } else {
          // Create a new batch/product entry
          const count = await Product.countDocuments({
            tenantId: req.tenantId,
            name: originalProduct.name,
          }).session(session);

          targetProduct = new Product({
            tenantId: req.tenantId,
            name: originalProduct.name,
            category: originalProduct.category,
            unit: originalProduct.unit || unit,
            barcode: originalProduct.barcode,
            pricePerUnit: numSellingPrice,
            mrp: numMRP,
            purchasePrice: numPurchasePrice,
            stock: 0, // Will be updated below
            batchNumber: `Batch ${count + 1}`,
            minStockAlert: originalProduct.minStockAlert,
            hsnCode: hsnCode || originalProduct.hsnCode,
            gstRate: taxRate !== undefined ? taxRate : originalProduct.gstRate
          });
          await targetProduct.save({ session });
          isNewBatch = true;
        }
      }

      // Update Target Product Stock in memory
      targetProduct.stock += Number(quantity) / numConversionFactor;
      targetProduct.purchasePrice = numPurchasePrice;
      
      if (isNewBatch) {
        await targetProduct.save({ session });
      } else {
        bulkOperations.push({
          updateOne: {
            filter: { _id: targetProduct._id },
            update: {
              $inc: { stock: Number(quantity) / numConversionFactor },
              $set: { purchasePrice: numPurchasePrice }
            }
          }
        });
      }

      processedItems.push({
        productId: targetProduct._id,
        name: name || targetProduct.name,
        quantity: Number(quantity),
        unit: unit || targetProduct.unit,
        conversionFactor: numConversionFactor,
        purchasePrice: numPurchasePrice,
        taxRate: taxRate || 0,
        taxAmount: itemTaxAmount || 0,
        hsnCode: hsnCode || targetProduct.hsnCode || ""
      });
    }

    if (bulkOperations.length > 0) {
      await Product.bulkWrite(bulkOperations, { session });
    }

    // 3. Create Purchase Record
    const purchase = new Purchase({
      tenantId: req.tenantId,
      supplierName,
      supplierGSTIN,
      supplierPhone,
      supplierAddress,
      billNumber,
      items: processedItems,
      totalAmount: totalAmount || processedItems.reduce((acc, item) => acc + (item.quantity * item.purchasePrice), 0),
      taxAmount: taxAmount || 0,
      discount: discount || 0,
      paymentMode: paymentMode || "cash",
      paymentStatus: paymentStatus || "paid",
      date: date || new Date(),
    });

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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const oldPurchase = await Purchase.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    }).session(session);
    if (!oldPurchase) throw new Error("Purchase not found");

    // 1. Fetch all products from old and new items
    const oldProductIds = oldPurchase.items.map((i: any) => i.productId.toString());
    const newProductIds = items.map((i: any) => i.productId.toString());
    const allProductIds = [...new Set([...oldProductIds, ...newProductIds])];

    const products = await Product.find({
      _id: { $in: allProductIds },
      tenantId: req.tenantId,
    }).session(session);

    const productMap = new Map();
    products.forEach((p) => productMap.set(p._id.toString(), p));

    const bulkOperations = [];

    // 2. Revert Old Stock from all items
    for (const oldItem of oldPurchase.items) {
      const oldProduct = productMap.get(oldItem.productId.toString());
      if (oldProduct) {
        oldProduct.stock -= Number(oldItem.quantity);
        bulkOperations.push({
          updateOne: {
            filter: { _id: oldProduct._id },
            update: { $inc: { stock: -Number(oldItem.quantity) } },
          },
        });
      }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("At least one item is required");
    }

    const processedItems = [];

    // 3. Process New Items
    for (const item of items) {
      const { productId, quantity, purchasePrice, sellingPrice, mrp, name, unit, taxRate, taxAmount: itemTaxAmount, hsnCode } = item;

      const selectedProduct = productMap.get(productId.toString());
      if (!selectedProduct) throw new Error(`Selected product not found: ${productId}`);

      let targetProduct = selectedProduct;
      let isNewBatch = false;

      const numPurchasePrice = Number(purchasePrice);
      const numSellingPrice = sellingPrice !== undefined ? Number(sellingPrice) : selectedProduct.pricePerUnit;
      const numMRP = mrp !== undefined ? Number(mrp) : selectedProduct.mrp;

      if (
        numPurchasePrice !== selectedProduct.purchasePrice ||
        (sellingPrice !== undefined && numSellingPrice !== selectedProduct.pricePerUnit) ||
        (mrp !== undefined && numMRP !== selectedProduct.mrp)
      ) {
        const existingBatch = await Product.findOne({
          tenantId: req.tenantId,
          name: selectedProduct.name,
          purchasePrice: numPurchasePrice,
          pricePerUnit: numSellingPrice,
          mrp: numMRP,
        }).session(session);

        if (existingBatch) {
          targetProduct = existingBatch;
        } else {
          const count = await Product.countDocuments({
            tenantId: req.tenantId,
            name: selectedProduct.name,
          }).session(session);

          targetProduct = new Product({
            tenantId: req.tenantId,
            name: selectedProduct.name,
            category: selectedProduct.category,
            unit: selectedProduct.unit || unit,
            barcode: selectedProduct.barcode,
            pricePerUnit: numSellingPrice,
            mrp: numMRP,
            purchasePrice: numPurchasePrice,
            stock: 0,
            batchNumber: `Batch ${count + 1}`,
            minStockAlert: selectedProduct.minStockAlert,
            hsnCode: hsnCode || selectedProduct.hsnCode,
            gstRate: taxRate !== undefined ? taxRate : selectedProduct.gstRate
          });
          await targetProduct.save({ session });
          isNewBatch = true;
        }
      }

      // Apply New Stock in memory
      targetProduct.stock += Number(quantity);
      targetProduct.purchasePrice = numPurchasePrice;

      if (isNewBatch) {
        await targetProduct.save({ session });
      } else {
        bulkOperations.push({
          updateOne: {
            filter: { _id: targetProduct._id },
            update: {
              $inc: { stock: Number(quantity) },
              $set: { purchasePrice: numPurchasePrice }
            },
          },
        });
      }

      processedItems.push({
        productId: targetProduct._id,
        name: name || targetProduct.name,
        quantity: Number(quantity),
        unit: unit || targetProduct.unit,
        purchasePrice: numPurchasePrice,
        taxRate: taxRate || 0,
        taxAmount: itemTaxAmount || 0,
        hsnCode: hsnCode || targetProduct.hsnCode || ""
      });
    }

    if (bulkOperations.length > 0) {
      await Product.bulkWrite(bulkOperations, { session });
    }

    // 4. Update Purchase Record
    oldPurchase.supplierName = supplierName;
    oldPurchase.supplierGSTIN = supplierGSTIN || oldPurchase.supplierGSTIN;
    oldPurchase.supplierPhone = supplierPhone || oldPurchase.supplierPhone;
    oldPurchase.supplierAddress = supplierAddress || oldPurchase.supplierAddress;
    oldPurchase.billNumber = billNumber || oldPurchase.billNumber;
    oldPurchase.items = processedItems;
    oldPurchase.totalAmount = totalAmount || processedItems.reduce((acc, item) => acc + (item.quantity * item.purchasePrice), 0);
    oldPurchase.taxAmount = taxAmount !== undefined ? taxAmount : oldPurchase.taxAmount;
    oldPurchase.discount = discount !== undefined ? discount : oldPurchase.discount;
    oldPurchase.paymentMode = paymentMode || oldPurchase.paymentMode;
    oldPurchase.paymentStatus = paymentStatus || oldPurchase.paymentStatus;
    oldPurchase.date = date || oldPurchase.date;

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
    const purchase = await Purchase.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    }).session(session);
    if (!purchase) throw new Error("Purchase not found");

    // Revert Stock for all items
    const productIds = purchase.items.map((i: any) => i.productId.toString());
    const products = await Product.find({
      _id: { $in: productIds },
      tenantId: req.tenantId,
    }).session(session);

    const productMap = new Map();
    products.forEach((p) => productMap.set(p._id.toString(), p));

    const bulkOperations = [];

    for (const item of purchase.items) {
      const product = productMap.get(item.productId.toString());
      if (product) {
        bulkOperations.push({
          updateOne: {
            filter: { _id: product._id },
            update: { $inc: { stock: -Number(item.quantity) } },
          },
        });
      }
    }

    if (bulkOperations.length > 0) {
      await Product.bulkWrite(bulkOperations, { session });
    }

    await Purchase.deleteOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    }).session(session);

    await session.commitTransaction();
    res.json({ message: "Purchase deleted and stock reverted" });
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
      .populate("items.productId", "name unit mrp purchasePrice hasSubUnit subUnitName subUnitValue subUnitMrp subUnitPurchasePrice subUnitSalePrice")
      .populate(
        "tenantId",
        "companyName phone address email logoUrl signature upiId billingEmail billingAddress name",
      );

    if (!sale) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.status(200).json(sale);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
