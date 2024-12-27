const nodemailer = require("nodemailer");

const sendEmail = async ({ senderEmail, senderPassword, subject, html, mailList }) => {
    try {
        const transporter = nodemailer.createTransport({
            host: "smtp.travellerschoice.ae",
            port: 587,
            secure: false, // upgrade later with STARTTLS
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASSWORD,
            },
        });

        await transporter.sendMail({
            from: senderEmail,
            to: mailList,
            subject: `${process.env.COMPANY_NAME} - ${subject}`,
            html,
        });

        console.log("email has been sent");
    } catch (error) {
        console.log(error);
        console.log("E-mail not sent");
    }
};

module.exports = sendEmail;
