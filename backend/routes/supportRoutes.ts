import express, { Request, Response } from 'express';
import { sendContactEmail } from '../utils/emailService';

const router = express.Router();

// @desc    Submit contact form
// @route   POST /api/support/contact
router.post('/contact', async (req: Request, res: Response) => {
    try {
        const { name, email, subject, message } = req.body;
        
        if (!name || !email || !message) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        await sendContactEmail({ name, email, subject: subject || 'No Subject', message });

        res.status(200).json({ message: 'Message sent successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
