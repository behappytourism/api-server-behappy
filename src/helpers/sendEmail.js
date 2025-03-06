const nodemailer = require("nodemailer");
const { EmailConfig } = require("../models");

const sendEmail = async (email, subject, text, product, action, attachments) => {
    try {
        const emailConfig = await EmailConfig.findOne({ product, actions: { $in: [action] } });
        const transporter = nodemailer.createTransport({
            host: emailConfig ? emailConfig.host : process.env.EMAIL_HOST,
            port: emailConfig ? emailConfig.port : process.env.EMAIL_PORT,
            secure: emailConfig ? emailConfig.secure : process.env.EMAIL_SECURE, // upgrade later with STARTTLS
            auth: {
                user: emailConfig ? emailConfig.user : process.env.EMAIL,
                pass: emailConfig ? emailConfig.pass : process.env.PASSWORD,
            },
            tls: {
                rejectUnauthorized: false, 
            },
        });

        await transporter.sendMail({
            from: process.env.EMAIL,
            to: email,
            subject: `${subject}`,
            html: text,
            attachments: attachments,
        });

        console.log("email has been sent");
    } catch (error) {
        console.log(error);
        console.log("E-mail not sent");
    }
};

module.exports = sendEmail;
