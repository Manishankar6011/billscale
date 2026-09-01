import mongoose from 'mongoose';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Product from '../models/Product';
import Tenant from '../models/Tenant';

// @desc    Get all products for a tenant (Paginated)
// @route   GET /api/inventory
export const getProducts = async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;
        
        const search = req.query.search as string;
        const filterType = req.query.filterType as string; // 'all', 'low', 'out'
        const sortBy = req.query.sortBy as string;

        const tenantId = new mongoose.Types.ObjectId(req.tenantId as string);
        let query: any = { tenantId };

        // 1. Search Logic
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { barcode: { $regex: search, $options: 'i' } },
                { subUnitBarcode: { $regex: search, $options: 'i' } }
            ];
        }

        // 2. Filter Logic
        if (filterType === 'low') {
            query.$expr = { $lte: ["$stock", "$minStockAlert"] };
            query.stock = { $gt: 0 };
        } else if (filterType === 'out') {
            query.stock = { $lte: 0 };
        } else if (filterType === 'expiry') {
            query.expiryDate = { 
                $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) 
            };
        }

        // 3. Sort Logic
        let sort: any = { name: 1 };
        if (sortBy === 'price-asc') sort = { pricePerUnit: 1 };
        else if (sortBy === 'price-desc') sort = { pricePerUnit: -1 };
        else if (sortBy === 'stock-asc') sort = { stock: 1 };
        else if (sortBy === 'stock-desc') sort = { stock: -1 };

        const [products, totalCount, totalStats] = await Promise.all([
            Product.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limit),
            Product.countDocuments(query),
            Product.aggregate([
                { $match: query },
                { 
                    $group: { 
                        _id: null, 
                        totalPurchaseValue: { $sum: { $multiply: ["$stock", "$purchasePrice"] } },
                        totalSellingValue: { $sum: { $multiply: ["$stock", "$pricePerUnit"] } }
                    } 
                }
            ])
        ]);

        res.status(200).json({
            products,
            pagination: {
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                currentPage: page,
                limit
            },
            totalSellingValue: totalStats[0]?.totalSellingValue || 0,
            totalPurchaseValue: totalStats[0]?.totalPurchaseValue || 0
        });

    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get product by barcode
// @route   GET /api/inventory/barcode/:barcode
export const getProductByBarcode = async (req: AuthRequest, res: Response) => {
    try {
        const { barcode } = req.params;
        const tenantId = new mongoose.Types.ObjectId(req.tenantId as string);
        
        const product = await Product.findOne({
            tenantId,
            $or: [
                { barcode: barcode.trim() },
                { subUnitBarcode: barcode.trim() }
            ]
        });
        
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        res.status(200).json(product);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};


// @desc    Add a new product
// @route   POST /api/inventory
export const addProduct = async (req: AuthRequest, res: Response) => {
    try {
        const { name, purchasePrice, stock, batchNumber } = req.body;
        const normalizedName = name.trim();
        const numPurchasePrice = Number(purchasePrice);
        const numStock = Number(stock);

        // 0. Check Product Limit for Free Plan
        const tenant = await Tenant.findById(req.tenantId);
        if (tenant && (tenant as any).planType === 'free') {
            const productCount = await Product.countDocuments({ tenantId: req.tenantId });
            if (productCount >= 100) {
                return res.status(403).json({ 
                    message: 'Product limit (100) reached for Free Starter plan. Please upgrade to add more products.' 
                });
            }
        }
        
        // 1. Precise Check: If user provided a specific batch, check that batch first
        const escapedName = normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (batchNumber && batchNumber !== 'Default' && batchNumber !== '') {
            const batchMatch = await Product.findOne({
                tenantId: req.tenantId,
                name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
                batchNumber: batchNumber.trim()
            });

            if (batchMatch) {
                if (batchMatch.purchasePrice === numPurchasePrice) {
                    // Match found! Merge stock
                    batchMatch.stock += numStock;
                    const saved = await batchMatch.save();
                    return res.status(200).json({ ...saved.toObject(), message_type: 'updated' });
                } else {
                    // CONFLICT: Batch exists but price is different
                    return res.status(400).json({ 
                        message: `Batch "${batchNumber}" already exists for this product with a different price (₹${batchMatch.purchasePrice}). Please use a different batch name or update the existing batch.` 
                    });
                }
            }
        }

        // 2. Auto-merge check: If Name + All Prices match ANY existing batch, merge stock there
        const priceMatch = await Product.findOne({
            tenantId: req.tenantId,
            name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
            purchasePrice: numPurchasePrice,
            pricePerUnit: Number(req.body.pricePerUnit),
            mrp: Number(req.body.mrp)
        });

        if (priceMatch) {
            priceMatch.stock += numStock;
            const saved = await priceMatch.save();
            return res.status(200).json({ ...saved.toObject(), message_type: 'updated' });
        }

        // 3. New Batch: Name exists but price differs, or name is completely new
        console.log(`[addProduct] Creating new batch/product for ${normalizedName}`);
        const productData = { ...req.body, tenantId: req.tenantId };

        if (productData.imageUrl && productData.imageUrl.startsWith('data:image')) {
            const { uploadImage } = require('../utils/cloudinary');
            productData.imageUrl = await uploadImage(productData.imageUrl, `tenants/${req.tenantId}/inventory`);
        }
        
        // Auto-generate batch number if missing or colliding
        if (!productData.batchNumber || productData.batchNumber === 'Default' || productData.batchNumber === '') {
            const existingBatchesCount = await Product.countDocuments({ 
                tenantId: req.tenantId, 
                name: { $regex: new RegExp(`^${normalizedName}$`, 'i') } 
            });
            
            if (existingBatchesCount > 0) {
                productData.batchNumber = `Batch ${existingBatchesCount + 1}`;
            } else {
                productData.batchNumber = 'Default';
            }
        }

        const product = new Product(productData);
        const savedProduct = await product.save();
        res.status(201).json({ ...savedProduct.toObject(), message_type: 'created' });
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
};

// @desc    Bulk add products
// @route   POST /api/inventory/bulk
export const bulkAddProducts = async (req: AuthRequest, res: Response) => {
    try {
        const productsData = req.body; // Expecting an array
        if (!Array.isArray(productsData)) {
            return res.status(400).json({ message: 'Data must be an array' });
        }

        // 1. Fetch current status & constraints in parallel
        const [tenant, existingProducts] = await Promise.all([
            Tenant.findById(req.tenantId),
            Product.find({ tenantId: req.tenantId })
        ]);

        const isFree = tenant && (tenant as any).planType === 'free';
        const maxLimit = 100;
        let currentCount = existingProducts.length;

        // 2. Dual-Level Indexing for fast O(1) lookup
        // Priority 1: name_batchNumber (Normalized for conflict/merge detection)
        const batchMap = new Map();
        // Priority 2: name_purchasePrice (To merge stock even if batch name was missing)
        const priceMap = new Map();
        // Tracking: current batch counts for auto-naming
        const nameCountMap = new Map();

        existingProducts.forEach(p => {
            const normalizedName = p.name.trim().toLowerCase();
            const normalizedBatch = (p.batchNumber || 'Default').trim().toLowerCase();
            
            batchMap.set(`${normalizedName}_${normalizedBatch}`, p);
            // Use a composite key for price matching: name_purchasePrice_sellingPrice_mrp
            priceMap.set(`${normalizedName}_${p.purchasePrice}_${p.pricePerUnit}_${p.mrp}`, p);
            
            nameCountMap.set(normalizedName, (nameCountMap.get(normalizedName) || 0) + 1);
        });

        const ops: any[] = [];
        const stats = { created: 0, updated: 0, errors: 0, limitReached: 0, priceConflicts: 0 };

        // 3. Process incoming data into bulk operations
        for (const data of productsData) {
            try {
                const { name, purchasePrice, stock, pricePerUnit, barcode, unit, batchNumber, mrp, category } = data;
                if (!name) { stats.errors++; continue; }

                const normalizedName = name.trim().toLowerCase();
                const normalizedReqBatch = (batchNumber && batchNumber !== 'Default' && batchNumber !== '') 
                    ? batchNumber.trim().toLowerCase() 
                    : null;
                const numPurchasePrice = Number(purchasePrice) || 0;
                const numStock = Number(stock) || 0;

                let targetProduct = null;

                // Step A: Check if SPECIFIC BATCH provided and if it matches
                if (normalizedReqBatch) {
                    const existingBatchMode = batchMap.get(`${normalizedName}_${normalizedReqBatch}`);
                    if (existingBatchMode) {
                        if (existingBatchMode.purchasePrice === numPurchasePrice) {
                            targetProduct = existingBatchMode;
                        } else {
                            // PRICE CONFLICT: This batch name is already taken by a different price
                            stats.priceConflicts++;
                            stats.errors++;
                            continue; 
                        }
                    }
                }

                // Step B: Check if Name + All Prices match ANY existing batch (Auto-merge)
                if (!targetProduct) {
                    const priceKey = `${normalizedName}_${numPurchasePrice}_${Number(pricePerUnit) || 0}_${Number(mrp) || 0}`;
                    const existingPriceMode = priceMap.get(priceKey);
                    if (existingPriceMode) {
                        targetProduct = existingPriceMode;
                    }
                }

                if (targetProduct) {
                    // Update Existing Record (Merge Stock)
                    ops.push({
                        updateOne: {
                            filter: { _id: targetProduct._id },
                            update: {
                                $inc: { stock: numStock },
                                $set: {
                                    pricePerUnit: Number(pricePerUnit) || targetProduct.pricePerUnit,
                                    barcode: barcode || targetProduct.barcode,
                                    unit: unit || targetProduct.unit,
                                    mrp: Number(mrp) || targetProduct.mrp,
                                    category: category || targetProduct.category || 'General'
                                }
                            }
                        }
                    });
                    stats.updated++;
                } else {
                    // Create NEW Batch/Record
                    if (isFree && currentCount >= maxLimit) {
                        stats.limitReached++;
                        continue;
                    }

                    const batchCount = nameCountMap.get(normalizedName) || 0;
                    const finalBatch = (batchNumber && batchNumber !== 'Default') 
                        ? batchNumber.trim() 
                        : (batchCount > 0 ? `Batch ${batchCount + 1}` : 'Default');

                    const newDoc = {
                        tenantId: req.tenantId,
                        name: name.trim(),
                        purchasePrice: numPurchasePrice,
                        pricePerUnit: Number(pricePerUnit) || 0,
                        stock: numStock,
                        unit: unit || 'piece',
                        barcode: barcode || '',
                        batchNumber: finalBatch,
                        mrp: Number(mrp) || 0,
                        category: category || 'General',
                        createdAt: new Date()
                    };

                    ops.push({
                        insertOne: {
                            document: newDoc
                        }
                    });

                    // Update local maps for intra-batch merge handling within the SAME bulk array
                    const normalizedFinalBatch = finalBatch.toLowerCase();
                    batchMap.set(`${normalizedName}_${normalizedFinalBatch}`, { ...newDoc, _id: `temp_${stats.created}` });
                    const newPriceKey = `${normalizedName}_${numPurchasePrice}_${Number(pricePerUnit) || 0}_${Number(mrp) || 0}`;
                    priceMap.set(newPriceKey, { ...newDoc, _id: `temp_${stats.created}` });
                    nameCountMap.set(normalizedName, batchCount + 1);
                    
                    stats.created++;
                    currentCount++;
                }
            } catch (err) {
                stats.errors++;
            }
        }

        // 4. Finalize Bulk Execution
        if (ops.length > 0) {
            await Product.bulkWrite(ops, { ordered: false });
        }

        res.status(200).json({ 
            message: `Bulk processing complete. Created: ${stats.created}, Updated: ${stats.updated}${stats.limitReached > 0 ? `, Limit reached: ${stats.limitReached} skipped` : ''}`,
            stats 
        });

    } catch (err: any) {
        console.error('[BulkAdd] Error:', err);
        res.status(500).json({ message: err.message });
    }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
    try {
        const productData = { ...req.body };

        if (productData.imageUrl !== undefined) {
            const existingProduct = await Product.findOne({ _id: req.params.id, tenantId: req.tenantId });
            if (existingProduct && productData.imageUrl !== existingProduct.imageUrl) {
                if (existingProduct.imageUrl) {
                    try {
                        const { deleteImageFromCloudinary } = require('../utils/cloudinary');
                        await deleteImageFromCloudinary(existingProduct.imageUrl);
                    } catch (err) {
                        console.error('Failed to delete old image:', err);
                    }
                }
                if (productData.imageUrl.startsWith('data:image')) {
                    const { uploadImage } = require('../utils/cloudinary');
                    productData.imageUrl = await uploadImage(productData.imageUrl, `tenants/${req.tenantId}/inventory`);
                }
            }
        }

        const product = await Product.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenantId },
            { $set: productData },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json(product);
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
};

// @desc    Delete a product
// @route   DELETE /api/inventory/:id
export const deleteProduct = async (req: AuthRequest, res: Response) => {
    try {
        const product = await Product.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (product.imageUrl) {
            try {
                const { deleteImageFromCloudinary } = require('../utils/cloudinary');
                await deleteImageFromCloudinary(product.imageUrl);
            } catch (err) {
                console.error('Failed to delete image:', err);
            }
        }

        res.status(200).json({ message: 'Product removed' });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Update multiple products
// @route   PUT /api/inventory/bulk-update
// @access  Private
export const bulkUpdateProducts = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { productIds, updateData } = req.body;
        
        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({ message: 'No products provided for update' });
        }

        await Product.updateMany(
            { _id: { $in: productIds }, tenantId: req.tenantId },
            { $set: updateData }
        );

        res.status(200).json({ message: 'Products updated successfully' });
    } catch (err: any) {
        console.error('Bulk update error:', err);
        res.status(500).json({ message: err.message || 'Failed to update products' });
    }
};
