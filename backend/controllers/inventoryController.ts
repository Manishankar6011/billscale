import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Product from '../models/Product';

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
