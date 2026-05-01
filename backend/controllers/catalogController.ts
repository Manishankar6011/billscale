import { Request, Response } from 'express';
import Tenant from '../models/Tenant';
import Product from '../models/Product';

export const getCatalogBySlug = async (req: Request, res: Response) => {
    const { slug } = req.params;

    try {
        const tenant = await Tenant.findOne({ slug });
        if (!tenant) {
            return res.status(404).json({ message: 'Shop not found' });
        }

        const products = await Product.find({ tenantId: tenant._id, stock: { $gt: 0 } })
            .select('name pricePerUnit mrp unit imageUrl category stock')
            .sort({ category: 1, name: 1 });

        res.json({
            shopName: tenant.companyName,
            address: tenant.address,
            phone: tenant.phone,
            logoUrl: tenant.logoUrl,
            products
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
