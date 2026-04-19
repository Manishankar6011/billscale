import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Product from '../models/Product';
import Tenant from '../models/Tenant';

// @desc    Get all products for a tenant
// @route   GET /api/inventory
export const getProducts = async (req: AuthRequest, res: Response) => {
    try {
        const products = await Product.find({ tenantId: req.tenantId });
        res.status(200).json(products);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Add a new product
// @route   POST /api/inventory
export const addProduct = async (req: AuthRequest, res: Response) => {
    try {
        const { name, purchasePrice, stock } = req.body;

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
        
        // 1. Check if a product with exact name and purchasePrice exists for this tenant
        const query = {
            tenantId: req.tenantId,
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }, 
            purchasePrice: Number(purchasePrice)
        };

        const existingProduct = await Product.findOne(query);

        if (existingProduct) {
            // If exists, just increment the stock
            existingProduct.stock += Number(stock);
            
            // Optionally sync other fields if they were provided in the request
            if (req.body.pricePerUnit) existingProduct.pricePerUnit = Number(req.body.pricePerUnit);
            if (req.body.mrp) existingProduct.mrp = Number(req.body.mrp);
            if (req.body.barcode) existingProduct.barcode = req.body.barcode;
            
            const savedProduct = await existingProduct.save();
            return res.status(200).json(savedProduct);
        }

        console.log(`[addProduct] No matching product found. Creating new document.`);
        // 2. If name exists but price differs, or name doesn't exist at all, create new product/batch
        const productData = { ...req.body, tenantId: req.tenantId };
        
        // Generate a batch number if "Default" or empty is provided and other batches exist
        if (!productData.batchNumber || productData.batchNumber === 'Default' || productData.batchNumber === '') {
            const count = await Product.countDocuments({ 
                tenantId: req.tenantId, 
                name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
            });
            if (count > 0) {
                productData.batchNumber = `Batch ${count + 1}`;
            } else {
                productData.batchNumber = 'Default';
            }
        }

        const product = new Product(productData);
        const savedProduct = await product.save();
        res.status(201).json(savedProduct);
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

        const stats = { created: 0, updated: 0, errors: 0 };
        const results = [];

        // Check Product Limit for Free Plan
        const tenant = await Tenant.findById(req.tenantId);
        const isFree = tenant && (tenant as any).planType === 'free';
        let currentProductCount = isFree ? await Product.countDocuments({ tenantId: req.tenantId }) : 0;

        for (const data of productsData) {
            try {
                const { name, purchasePrice, stock } = data;
                
                const query = {
                    tenantId: req.tenantId,
                    name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }, 
                    purchasePrice: Number(purchasePrice)
                };

                const existingProduct = await Product.findOne(query);

                if (existingProduct) {
                    existingProduct.stock += Number(stock);
                    if (data.pricePerUnit) existingProduct.pricePerUnit = Number(data.pricePerUnit);
                    if (data.mrp) existingProduct.mrp = Number(data.mrp);
                    if (data.barcode) existingProduct.barcode = data.barcode;
                    
                    await existingProduct.save();
                    stats.updated++;
                } else {
                    // Check limit before creating new product
                    if (isFree && currentProductCount >= 100) {
                        stats.errors++;
                        continue; // Skip this one
                    }

                    const productData = { ...data, tenantId: req.tenantId };
                    
                    if (!productData.batchNumber || productData.batchNumber === 'Default' || productData.batchNumber === '') {
                        const count = await Product.countDocuments({ 
                            tenantId: req.tenantId, 
                            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
                        });
                        productData.batchNumber = count > 0 ? `Batch ${count + 1}` : 'Default';
                    }

                    const product = new Product(productData);
                    await product.save();
                    stats.created++;
                    currentProductCount++;
                }
            } catch (err) {
                stats.errors++;
            }
        }

        res.status(200).json({ 
            message: `Bulk processing complete. Created: ${stats.created}, Updated: ${stats.updated}, Errors: ${stats.errors}`,
            stats 
        });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
    try {
        const product = await Product.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenantId },
            { ...req.body },
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

        res.status(200).json({ message: 'Product removed' });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};
