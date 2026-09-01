import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Tenant from '../models/Tenant';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import sendEmail from '../utils/sendEmail';
import Attendance from '../models/Attendance';
import Customer from '../models/Customer';
import MasterProduct from '../models/MasterProduct';
import Payment from '../models/Payment';
import Product from '../models/Product';
import Purchase from '../models/Purchase';
import SalaryPayment from '../models/SalaryPayment';
import Sale from '../models/Sale';
import Staff from '../models/Staff';
import CustomerPayment from '../models/CustomerPayment';
import { slugify } from '../utils/slugify';

const generateToken = (id: string) => {
    return jwt.sign({ id }, process.env.JWT_SECRET as string, {
        expiresIn: '30d',
    });
};

export const registerContractor = async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, password, companyName, businessType, referralCode } = req.body;

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        let referredBy = undefined;
        if (referralCode) {
            const referrer = await Tenant.findOne({ referralCode: referralCode.trim().toUpperCase() });
            if (referrer) {
                referredBy = referrer._id;
            }
        }

        const tenant = await Tenant.create({
            companyName,
            email,
            businessType: businessType || 'Retail',
            planType: 'free',
            referredBy,
            slug: slugify(companyName)
        });

        const user = await User.create({
            name,
            email,
            password,
            role: 'owner',
            tenantId: tenant._id
        });

        if (user) {
            const populatedUser = await User.findById(user._id).select('-password').populate('tenantId');
            const token = generateToken(user._id.toString());
            res.status(201).json({
                ...populatedUser?.toObject(),
                token
            });
        }
    } catch (error: any) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'User already exists with this email. Please login.' });
        }
        res.status(500).json({ message: error.message });
    }
};

export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await user.comparePassword(password))) {
            const populatedUser = await User.findById(user._id).select('-password').populate('tenantId');
            const token = generateToken(user._id.toString());
            
            // Auto-generate slug if missing (for legacy users)
            if (populatedUser?.tenantId && !(populatedUser.tenantId as any).slug) {
                const tenant = await Tenant.findById((populatedUser.tenantId as any)._id);
                if (tenant) {
                    tenant.slug = slugify(tenant.companyName);
                    try {
                        await tenant.save();
                        (populatedUser.tenantId as any).slug = tenant.slug;
                    } catch (e) {
                        // If slug exists, add random suffix
                        tenant.slug = `${tenant.slug}-${Math.floor(Math.random() * 1000)}`;
                        await tenant.save();
                        (populatedUser.tenantId as any).slug = tenant.slug;
                    }
                }
            }

            res.json({
                ...populatedUser?.toObject(),
                token
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = await User.findById(req.user?._id).select('-password').populate('tenantId');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { name, companyName, address, phone, billingEmail, billingAddress, logoUrl, signature, upiId, slug, gstin, pan, stateName, stateCode, invoiceFormat, enableInventoryImageUpload } = req.body;

    try {
        const user = await User.findById(req.user?._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (name) user.name = name;
        await user.save();

        if (user.tenantId) {
            const tenant = await Tenant.findById(user.tenantId);
            if (tenant) {
                if (companyName) tenant.companyName = companyName;
                if (address) tenant.address = address;
                if (phone) tenant.phone = phone;
                if (billingEmail !== undefined) tenant.billingEmail = billingEmail;
                if (billingAddress !== undefined) tenant.billingAddress = billingAddress;
                if (upiId !== undefined) tenant.upiId = upiId;
                if (gstin !== undefined) tenant.gstin = gstin;
                if (pan !== undefined) tenant.pan = pan;
                if (stateName !== undefined) tenant.stateName = stateName;
                if (stateCode !== undefined) tenant.stateCode = stateCode;
                if (invoiceFormat !== undefined) tenant.invoiceFormat = invoiceFormat;
                if (enableInventoryImageUpload !== undefined) tenant.enableInventoryImageUpload = enableInventoryImageUpload;
                if (slug) tenant.slug = slugify(slug);
                
                // Handle Logo Update & Cleanup
                if (logoUrl !== undefined && logoUrl !== tenant.logoUrl) {
                    // Delete old logo if it exists on Cloudinary
                    if (tenant.logoUrl) {
                        try {
                            const { deleteImageFromCloudinary } = require('../utils/cloudinary');
                            await deleteImageFromCloudinary(tenant.logoUrl);
                        } catch (err) {
                            console.error('Failed to delete old logo:', err);
                        }
                    }

                    // If it's Base64, upload it (Fallback/Direct)
                    if (logoUrl.startsWith('data:image')) {
                        const { uploadImage } = require('../utils/cloudinary');
                        tenant.logoUrl = await uploadImage(logoUrl, `tenants/${tenant._id}/logos`);
                    } else {
                        tenant.logoUrl = logoUrl;
                    }
                }

                // Handle Signature Update & Cleanup
                if (signature !== undefined && signature !== tenant.signature) {
                    // Delete old signature if it exists on Cloudinary
                    if (tenant.signature) {
                        try {
                            const { deleteImageFromCloudinary } = require('../utils/cloudinary');
                            await deleteImageFromCloudinary(tenant.signature);
                        } catch (err) {
                            console.error('Failed to delete old signature:', err);
                        }
                    }

                    // If it's Base64, upload it
                    if (signature.startsWith('data:image')) {
                        const { uploadImage } = require('../utils/cloudinary');
                        tenant.signature = await uploadImage(signature, `tenants/${tenant._id}/signatures`);
                    } else {
                        tenant.signature = signature;
                    }
                }

                await tenant.save();
            }
        }

        const updatedUser = await User.findById(req.user?._id).select('-password').populate('tenantId');
        res.json(updatedUser);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getReferralStats = async (req: AuthRequest, res: Response) => {
    try {
        const referrals = await Tenant.find({ referredBy: req.tenantId })
            .select('companyName planType createdAt referralRewardClaimed email')
            .sort({ createdAt: -1 });

        res.json(referrals);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Hash and set to User model
        user.resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // Set expire (10 minutes)
        user.resetPasswordExpire = new Date(Date.now() + 600000);

        await user.save();

        // Create reset URL (Point to Frontend)
        const host = req.get('host') || 'localhost:5000';
        let frontendUrl = process.env.FRONTEND_URL;
        if (!frontendUrl) {
            frontendUrl = host.includes('localhost') || host.includes('127.0.0.1')
                ? `${req.protocol}://${host.replace(':5000', ':5173')}`
                : 'https://billscale.in';
        }
        const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

        const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a put request to: \n\n ${resetUrl}`;

        try {
            await sendEmail({
                email: user.email,
                subject: 'BuildMate ERP Password Reset',
                message
            });

            res.json({ message: 'Email sent successfully' });
        } catch (err: any) {
            console.error(err);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();
            return res.status(500).json({ message: 'Email could not be sent' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(token as string)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        // Set new password
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.json({ message: 'Password reset successful' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteAccount = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = await User.findById(req.user?._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role !== 'owner') {
            return res.status(403).json({ message: 'Only the account owner can delete the account' });
        }

        const tenantId = user.tenantId;

        if (!tenantId) {
            return res.status(400).json({ message: 'No tenant associated with this user' });
        }

        // Delete all data associated with the tenant
        await Promise.all([
            Attendance.deleteMany({ tenantId }),
            Customer.deleteMany({ tenantId }),
            MasterProduct.deleteMany({ tenantId }),
            Payment.deleteMany({ tenantId }),
            Product.deleteMany({ tenantId }),
            Purchase.deleteMany({ tenantId }),
            SalaryPayment.deleteMany({ tenantId }),
            Sale.deleteMany({ tenantId }),
            User.deleteMany({ tenantId }),
            Staff.deleteMany({ tenantId }),
            CustomerPayment.deleteMany({ tenantId })
        ]);

        // Delete the tenant itself
        await Tenant.findByIdAndDelete(tenantId);

        res.json({ message: 'Account and all associated data deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new staff user account
// @route   POST /api/auth/staff
// @access  Private (Owner Only)
export const createStaffUser = async (req: AuthRequest, res: Response) => {
    const { name, email, password } = req.body;
    const tenantId = req.tenantId;

    try {
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please provide name, email and password' });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // Plan-based Staff Account Limit
        const tenant = await Tenant.findById(tenantId);
        const plan = tenant?.planType || 'free';
        const staffAccountsCount = await User.countDocuments({ tenantId, role: 'staff' });

        if (plan === 'free' && staffAccountsCount >= 0) {
            return res.status(403).json({ message: 'Free Plan limit reached! You can only manage 0 staff accounts. Please upgrade.' });
        }
        if (plan === 'basic' && staffAccountsCount >= 1) {
            return res.status(403).json({ message: 'Basic Plan limit reached! You can only manage up to 1 staff account. Please upgrade.' });
        }
        if (plan === 'business' && staffAccountsCount >= 5) {
            return res.status(403).json({ message: 'Business Plan limit reached! You can only manage up to 5 staff accounts.' });
        }

        const user = await User.create({
            name,
            email,
            password,
            role: 'staff',
            tenantId
        });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all staff users for a tenant
// @route   GET /api/auth/staff
// @access  Private (Owner/Accountant)
export const getStaffUsers = async (req: AuthRequest, res: Response) => {
    try {
        const staffUsers = await User.find({ 
            tenantId: req.tenantId, 
            role: 'staff' 
        }).select('-password');
        
        res.json(staffUsers);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a staff user account
// @route   DELETE /api/auth/staff/:id
// @access  Private (Owner Only)
export const deleteStaffUser = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findOne({ 
            _id: req.params.id, 
            tenantId: req.tenantId,
            role: 'staff'
        });

        if (!user) {
            return res.status(404).json({ message: 'Staff user not found' });
        }

        await User.deleteOne({ _id: user._id });
        res.json({ message: 'Staff user deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
