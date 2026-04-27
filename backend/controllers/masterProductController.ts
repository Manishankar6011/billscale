import { Request, Response } from 'express';
import MasterProduct from '../models/MasterProduct';

// @desc    Get all master products
// @route   GET /api/master-products
export const getMasterProducts = async (req: Request, res: Response) => {
    try {
        const { search, category } = req.query;
        let query: any = {};

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 24;
        const skip = (page - 1) * limit;

        const totalProducts = await MasterProduct.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        const products = await MasterProduct.find(query)
            .sort({ name: 1 })
            .skip(skip)
            .limit(limit);
            
        res.status(200).json({
            products,
            pagination: {
                currentPage: page,
                totalPages,
                totalProducts
            }
        });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get categories of master products
// @route   GET /api/master-products/categories
export const getMasterCategories = async (req: Request, res: Response) => {
    try {
        const categories = await MasterProduct.distinct('category');
        res.status(200).json(categories);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};
