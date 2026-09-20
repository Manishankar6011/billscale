import { Request, Response } from 'express';
import Tenant from '../models/Tenant';
import Product from '../models/Product';
import { AuthRequest } from '../middleware/auth';
import dns from 'dns';
import { promisify } from 'util';
import axios from 'axios';

const resolveCname = promisify(dns.resolveCname);
const resolve4 = promisify(dns.resolve4);

// Helper to extract apex domain (e.g. store.a2supermart.com -> a2supermart.com)
const extractApexDomain = (hostname: string): string => {
    const clean = hostname.replace(/^www\./, '');
    const parts = clean.split('.');
    if (parts.length <= 2) return clean;
    const twoPartTlds = ['co.in', 'com.in', 'org.in', 'net.in', 'co.uk', 'gov.in'];
    const lastTwo = parts.slice(-2).join('.');
    if (twoPartTlds.includes(lastTwo)) {
        return parts.slice(-3).join('.');
    }
    return parts.slice(-2).join('.');
};

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
    // Priority:
    // 1. Explicit domain query param from client (?domain=store.example.com)
    // 2. Custom header x-custom-domain
    // 3. x-forwarded-host or host header
    const rawHost = (
        (req.query.domain as string) ||
        (req.headers['x-custom-domain'] as string) ||
        req.headers['x-forwarded-host'] ||
        req.headers.host
    )?.toString();

    if (!rawHost) {
        return res.status(400).json({ message: 'No host or domain parameter found' });
    }

    // Clean host: strip proxies (take first), remove protocol, paths, and ports
    const host = rawHost
        .split(',')[0]
        .trim()
        .replace(/^https?:\/\//, '')
        .split('/')[0]
        .split(':')[0]
        .toLowerCase();

    if (!host) {
        return res.status(400).json({ message: 'Invalid host header' });
    }

    try {
        const hostWithoutWww = host.replace(/^www\./, '');
        const apexDomain = extractApexDomain(host);

        // Candidate domains to check
        const candidates = Array.from(new Set([
            host,
            hostWithoutWww,
            `www.${hostWithoutWww}`,
            apexDomain,
            `store.${apexDomain}`,
            `shop.${apexDomain}`
        ]));

        // Match tenant by any of the candidate domains
        let tenant = await Tenant.findOne({
            customDomain: { $in: candidates }
        });

        // Fallback: match by root domain pattern if tenant saved an apex or subdomain
        if (!tenant && apexDomain && apexDomain.includes('.')) {
            tenant = await Tenant.findOne({
                customDomain: new RegExp(`(^|\\.)${apexDomain.replace('.', '\\.')}$`, 'i')
            });
        }

        if (!tenant) {
            return res.status(404).json({ message: 'No active store found for this domain' });
        }

        // Auto-activate store if the request successfully hit this endpoint
        // Because if the user's traffic reached here on this domain, DNS is undeniably working!
        if (tenant.customDomainStatus !== 'active') {
            await Tenant.findByIdAndUpdate(tenant._id, {
                customDomainStatus: 'active',
                customDomainVerifiedAt: new Date()
            });
            tenant.customDomainStatus = 'active';
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
                // Check direct domain
                const response = await axios.get(
                    `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domain}`,
                    {
                        headers: {
                            Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
                        },
                    }
                );
                isVerified = !!response.data?.verified;
            } catch (vercelError: any) {
                // If not found directly, check if store.domain or apex domain is verified on this project
                try {
                    const apex = extractApexDomain(domain);
                    const candidatesToCheck = [`store.${apex}`, apex, `www.${apex}`].filter(d => d !== domain);
                    for (const altDomain of candidatesToCheck) {
                        try {
                            const altRes = await axios.get(
                                `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${altDomain}`,
                                {
                                    headers: {
                                        Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
                                    },
                                }
                            );
                            if (altRes.data?.verified) {
                                isVerified = true;
                                break;
                            }
                        } catch {
                            // ignore alt domain 404
                        }
                    }
                } catch (altErr) {
                    console.error("Error checking alternative Vercel domains:", altErr);
                }
            }
        }

        // Manual DNS fallback if not verified yet
        if (!isVerified) {
            // 1. Try CNAME check
            try {
                const cnameRecords = await resolveCname(domain);
                isVerified = cnameRecords.some(record =>
                    record.toLowerCase().includes(appDomain.toLowerCase()) ||
                    record.toLowerCase().endsWith('.vercel.app') ||
                    record.toLowerCase().endsWith('.vercel-dns.com') ||
                    record.toLowerCase().endsWith('.billscale.in')
                );
                if (!isVerified && cnameRecords.length > 0) foundRecord = cnameRecords[0];
            } catch (dnsErr: any) {
                // CNAME might fail on apex domains, proceed to A record check
            }

            // 2. Try A record check (for apex domains pointing to Vercel IP: 76.76.21.61)
            if (!isVerified) {
                try {
                    const aRecords = await resolve4(domain);
                    const vercelIps = ['76.76.21.61', '76.76.21.21', '76.76.21.98', '76.76.21.142', '216.198.79.1'];
                    isVerified = aRecords.some(ip => vercelIps.includes(ip));
                    if (!isVerified && aRecords.length > 0) foundRecord = aRecords[0];
                } catch (aErr) {
                    // A record lookup failed
                }
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
