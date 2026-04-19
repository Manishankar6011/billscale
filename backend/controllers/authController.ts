import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Tenant from '../models/Tenant';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import sendEmail from '../utils/sendEmail';
import { uploadImage } from '../utils/cloudinary';

const generateToken = (id: string) => {
    return jwt.sign({ id }, process.env.JWT_SECRET as string, {
        expiresIn: '30d',
    });
};

export const registerContractor = async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, password, companyName, businessType } = req.body;

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const tenant = await Tenant.create({
            companyName,
            email,
            businessType: businessType || 'Retail',
            planType: 'free'
        });

        const user = await User.create({
            name,
            email,
            password,
            role: 'owner',
            tenantId: tenant._id
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                tenantId: user.tenantId,
                companyName: tenant.companyName,
                subscriptionStatus: (tenant as any).subscriptionStatus,
                planType: (tenant as any).planType,
                subscriptionExpiryDate: tenant.subscriptionExpiryDate,
                aiUsageCount: (tenant as any).aiUsageCount || 0,
                token: generateToken(user._id.toString()),
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
            const tenant = await Tenant.findById(user.tenantId);
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                tenantId: user.tenantId,
                companyName: tenant?.companyName,
                subscriptionStatus: (tenant as any)?.subscriptionStatus,
                planType: (tenant as any)?.planType,
                subscriptionExpiryDate: (tenant as any)?.subscriptionExpiryDate,
                aiUsageCount: (tenant as any)?.aiUsageCount || 0,
                token: generateToken(user._id.toString()),
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
    const { name, companyName, address, phone, billingEmail, billingAddress, logoUrl, signature } = req.body;

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
        const frontendUrl = process.env.FRONTEND_URL || `${req.protocol}://${host.replace(':5000', ':5173')}`;
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
