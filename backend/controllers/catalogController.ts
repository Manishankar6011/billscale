import { Request, Response } from 'express';
import Tenant from '../models/Tenant';
import Product from '../models/Product';
import { AuthRequest } from '../middleware/auth';
import dns from 'dns';
import { promisify } from 'util';
import axios from 'axios';

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

        // Vercel API Integration to add domain
        if (process.env.VERCEL_API_TOKEN && process.env.VERCEL_PROJECT_ID) {
            try {
                await axios.post(
                    `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains`,
                    { name: cleaned },
                    {
                        headers: {
                            Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
                        },
                    }
                );
            } catch (vercelError: any) {
                // If it's already added to the project, Vercel might throw a 400/409, we can ignore if it's already ours, but let's log it
                console.error("Vercel API Error adding domain:", vercelError.response?.data || vercelError.message);
                if (vercelError.response?.data?.error?.code !== 'domain_already_in_use') {
                    return res.status(500).json({ message: 'Failed to register domain with Vercel.', error: vercelError.response?.data });
                }
            }
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
        const appDomain = process.env.APP_DOMAIN || 'buildmate-erp.vercel.app';
        let isVerified = false;
        let foundRecord = null;

        if (process.env.VERCEL_API_TOKEN && process.env.VERCEL_PROJECT_ID) {
            // Use Vercel API for verification check
            try {
                const response = await axios.get(
                    `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domain}`,
                    {
                        headers: {
                            Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
                        },
                    }
                );
                isVerified = response.data.verified;
            } catch (vercelError: any) {
                console.error("Vercel API Error verifying domain:", vercelError.response?.data || vercelError.message);
                // Fallback to manual DNS if Vercel API fails for some reason
            }
        }

        // Manual DNS fallback if Vercel API isn't configured or failed
        if (!isVerified && (!process.env.VERCEL_API_TOKEN || !process.env.VERCEL_PROJECT_ID)) {
            try {
                const cnameRecords = await resolveCname(domain);
                isVerified = cnameRecords.some(record =>
                    record.toLowerCase().includes(appDomain.toLowerCase()) ||
                    record.toLowerCase().endsWith('.vercel.app') ||
                    record.toLowerCase().endsWith('.vercel-dns.com') ||
                    record.toLowerCase().endsWith('.billscale.in')
                );
                if (!isVerified) foundRecord = cnameRecords[0];
            } catch (dnsErr: any) {
                // DNS lookup failed
            }
        }

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
                message: foundRecord 
                    ? `CNAME record found but points to "${foundRecord}" instead of Vercel. Please update your DNS settings.`
                    : `DNS lookup failed for "${domain}". Make sure you have added the CNAME record and DNS has propagated (can take up to 48 hours).`,
                customDomainStatus: 'failed',
                expected: appDomain,
                found: foundRecord
            });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Protected: Remove custom domain ───────────────────────────────────────
export const removeCustomDomain = async (req: AuthRequest, res: Response) => {
    try {
        const tenant = await Tenant.findById(req.user?.tenantId);
        
        if (tenant?.customDomain && process.env.VERCEL_API_TOKEN && process.env.VERCEL_PROJECT_ID) {
            try {
                await axios.delete(
                    `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${tenant.customDomain}`,
                    {
                        headers: {
                            Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
                        },
                    }
                );
            } catch (vercelError: any) {
                console.error("Vercel API Error removing domain:", vercelError.response?.data || vercelError.message);
                // We continue removing it from our DB even if Vercel API fails
            }
        }

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
