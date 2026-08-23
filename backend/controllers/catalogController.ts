import { Request, Response } from 'express';
import Tenant from '../models/Tenant';
import Product from '../models/Product';
import { AuthRequest } from '../middleware/auth';
import dns from 'dns';
import { promisify } from 'util';

const resolveCname = promisify(dns.resolveCname);

// ─── Public: Get catalog by slug ───────────────────────────────────────────
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

// ─── Public: Get catalog by custom domain (used by custom domain routing) ──
export const getCatalogByDomain = async (req: Request, res: Response) => {
    // Host header se domain nikaalo (port remove karo)
    const host = req.headers.host?.split(':')[0]?.toLowerCase();

    if (!host) {
        return res.status(400).json({ message: 'No host header found' });
    }

    try {
        const tenant = await Tenant.findOne({
            customDomain: host,
            customDomainStatus: 'active'
        });

        if (!tenant) {
            return res.status(404).json({ message: 'No active store found for this domain' });
        }

        const products = await Product.find({ tenantId: tenant._id, stock: { $gt: 0 } })
            .select('name pricePerUnit mrp unit imageUrl category stock')
            .sort({ category: 1, name: 1 });

        res.json({
            shopName: tenant.companyName,
            address: tenant.address,
            phone: tenant.phone,
            logoUrl: tenant.logoUrl,
            products,
            slug: tenant.slug
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Protected: Save custom domain (paid users only) ───────────────────────
export const saveCustomDomain = async (req: AuthRequest, res: Response) => {
    const { domain } = req.body;

    if (!domain || typeof domain !== 'string') {
        return res.status(400).json({ message: 'Domain is required' });
    }

    // Basic domain format validation
    const domainRegex = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})*\.[A-Za-z]{2,}$/;
    const cleaned = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/$/, '');

    if (!domainRegex.test(cleaned)) {
        return res.status(400).json({ message: 'Invalid domain format. Example: shop.yourdomain.com' });
    }

    try {
        // Check if domain is already taken by another tenant
        const existingTenant = await Tenant.findOne({
            customDomain: cleaned,
            _id: { $ne: req.user?.tenantId }
        });

        if (existingTenant) {
            return res.status(409).json({ message: 'This domain is already connected to another store.' });
        }

        const tenant = await Tenant.findByIdAndUpdate(
            req.user?.tenantId,
            {
                customDomain: cleaned,
                customDomainStatus: 'pending',
                customDomainVerifiedAt: undefined
            },
            { new: true }
        );

        res.json({
            message: 'Domain saved. Please add the CNAME record and then verify.',
            customDomain: tenant?.customDomain,
            customDomainStatus: tenant?.customDomainStatus
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Protected: Verify custom domain via DNS CNAME lookup ──────────────────
export const verifyCustomDomain = async (req: AuthRequest, res: Response) => {
    try {
        const tenant = await Tenant.findById(req.user?.tenantId);

        if (!tenant || !tenant.customDomain) {
            return res.status(400).json({ message: 'No custom domain configured. Please save a domain first.' });
        }

        const domain = tenant.customDomain;
        // Expected CNAME target — your Vercel deployment domain
        const appDomain = process.env.APP_DOMAIN || 'buildmate-erp.vercel.app';

        let cnameRecords: string[] = [];

        try {
            cnameRecords = await resolveCname(domain);
        } catch (dnsErr: any) {
            // DNS lookup failed (no record found)
            await Tenant.findByIdAndUpdate(req.user?.tenantId, {
                customDomainStatus: 'failed'
            });

            return res.status(422).json({
                message: `DNS lookup failed for "${domain}". Make sure you have added the CNAME record and DNS has propagated (can take up to 48 hours).`,
                customDomainStatus: 'failed',
                expected: appDomain,
                found: null
            });
        }

        // Check if any CNAME points to our app domain
        const isVerified = cnameRecords.some(record =>
            record.toLowerCase().includes(appDomain.toLowerCase()) ||
            record.toLowerCase().endsWith('.vercel.app') ||
            record.toLowerCase().endsWith('.vercel-dns.com')
        );

        if (isVerified) {
            await Tenant.findByIdAndUpdate(req.user?.tenantId, {
                customDomainStatus: 'active',
                customDomainVerifiedAt: new Date()
            });

            return res.json({
                message: '✅ Domain verified successfully! Your store is now live on your custom domain.',
                customDomainStatus: 'active',
                customDomain: domain
            });
        } else {
            await Tenant.findByIdAndUpdate(req.user?.tenantId, {
                customDomainStatus: 'failed'
            });

            return res.status(422).json({
                message: `CNAME record found but points to "${cnameRecords[0]}" instead of "${appDomain}". Please update your DNS settings.`,
                customDomainStatus: 'failed',
                expected: appDomain,
                found: cnameRecords[0]
            });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Protected: Remove custom domain ───────────────────────────────────────
export const removeCustomDomain = async (req: AuthRequest, res: Response) => {
    try {
        await Tenant.findByIdAndUpdate(req.user?.tenantId, {
            customDomain: '',
            customDomainStatus: 'pending',
            customDomainVerifiedAt: undefined
        });

        res.json({ message: 'Custom domain removed successfully.' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
