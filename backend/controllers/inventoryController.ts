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
        const product = new Product({
            ...req.body,
            tenantId: req.tenantId
        });

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
