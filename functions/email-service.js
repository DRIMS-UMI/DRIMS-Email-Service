//functions/email-service.js
const nodemailer = require("nodemailer");

exports.handler = async (event, context) => {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Max-Age': '86400'
            },
            body: ''
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Method Not Allowed' })
        }
    };

    // Validate API key
    const apiKey = event.headers['x-api-key'];
    const validApiKey = process.env.API_KEY;

    if (!validApiKey || apiKey !== validApiKey) {
        return {
            statusCode: 401,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                error: 'Unauthorized',
                message: 'Invalid or missing API key'
            }),
        };
    }

    try {
        // Parse request body
        let emailData;
        try {
            emailData = JSON.parse(event.body);
        } catch (parseError) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    error: 'Invalid JSON in request body'
                }),
            };
        }

        const { to, subject, text, html, from } = emailData;

        // Validate required fields
        if (!to) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ error: 'Missing required field: to' }),
            };
        }

        if (!subject) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ error: 'Missing required field: subject' }),
            };
        }

        if (!text && !html) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    error: 'Missing email content: either text or html is required'
                }),
            };
        }

        // Validate Gmail credentials
        if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    error: 'Email service not configured properly'
                }),
            };
        }

        // Create email transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD,
            },
        });

        // Verify transport configuration
        await transporter.verify();

        // Prepare email options
        const mailOptions = {
            from: from || process.env.GMAIL_USER,
            to: Array.isArray(to) ? to : [to],
            subject: subject,
            ...(text && { text: text }),
            ...(html && { html: html })
        };

        // Send email
        const result = await transporter.sendMail(mailOptions);

        console.log('Email sent successfully:', result.messageId);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                success: true,
                message: "Email sent successfully",
                messageId: result.messageId,
                accepted: result.accepted,
                rejected: result.rejected,
            })
        };

    } catch (error) {
        console.log('Email sending error:', error);

        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                success: false,
                error: 'Failed to send email',
                details: error.message,
            }),
        }
    }
}