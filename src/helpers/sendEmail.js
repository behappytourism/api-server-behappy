const nodemailer = require("nodemailer");
const { EmailConfig } = require("../models");

const sendEmail = async (email, subject, text, attachments) => {
    try {
        const transporter = nodemailer.createTransport({
            host:  process.env.EMAIL_HOST,
            port:  process.env.EMAIL_PORT,
            secure:  process.env.EMAIL_SECURE, // upgrade later with STARTTLS
            auth: {
                user:  process.env.EMAIL,
                pass:  process.env.PASSWORD,
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
