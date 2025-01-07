const nodemailer = require("nodemailer");
const { EmailConfig } = require("../models");

const sendEmailPromotion = async ({ email, subject, text, attachments, emailConfig }) => {
    try {
        const transporter = nodemailer.createTransport({
            host: emailConfig ? emailConfig?.host : process.env.EMAIL_HOST,
            port: emailConfig ? emailConfig?.port : process.env.EMAIL_PORT,
            secure: process.env.EMAIL_SECURE, // upgrade later with STARTTLS
            auth: {
                user: emailConfig ? emailConfig?.email : process.env.EMAIL,
                pass: emailConfig ? emailConfig?.password : process.env.PASSWORD,
            },
        });

        await transporter.sendMail({
            from: emailConfig ? emailConfig?.email : process.env.EMAIL,
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

module.exports = sendEmailPromotion;
