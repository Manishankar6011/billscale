import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Gmail App Password
    },
});

export const sendSubscriptionEmail = async (email: string, companyName: string, plan: string, expiry: Date) => {
    const mailOptions = {
        from: `"BuildMate ERP" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🎉 Subscription Activated - BuildMate ERP',
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h2 style="color: #4f46e5;">Welcome to the ${plan.toUpperCase()} Plan!</h2>
                <p>Hello <strong>${companyName}</strong>,</p>
                <p>Your subscription has been successfully activated. You now have full access to all features included in your plan.</p>
                
                <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Plan:</strong> ${plan.toUpperCase()}</p>
                    <p style="margin: 5px 0 0 0;"><strong>Active Until:</strong> ${new Date(expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>

                <p>Start managing your business more efficiently today!</p>
                <a href="${process.env.FRONTEND_URL || 'https://billscale.in'}/dashboard" 
                   style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                   Go to Dashboard
                </a>
                
                <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;">
                <p style="font-size: 12px; color: #6b7280; text-align: center;">BuildMate ERP - The Modern Way to Manage Business</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

export const sendContactEmail = async (formData: { name: string; email: string; subject: string; message: string }) => {
    const mailOptions = {
        from: `"BuildMate Support" <${process.env.EMAIL_USER}>`,
        to: 'manishankar6011@gmail.com', // Owner's email from request
        subject: `📩 New Contact Form: ${formData.subject}`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h2 style="color: #4f46e5;">New Support Inquiry</h2>
                <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>From:</strong> ${formData.name} (${formData.email})</p>
                    <p><strong>Subject:</strong> ${formData.subject}</p>
                    <p><strong>Message:</strong></p>
                    <div style="background: white; padding: 10px; border: 1px solid #eee; border-radius: 5px;">
                        ${formData.message.replace(/\n/g, '<br>')}
                    </div>
                </div>
                <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;">
                <p style="font-size: 10px; color: #9ca3af; text-align: center;">This message was sent from the BuildMate ERP contact form.</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending contact email:', error);
    }
};
