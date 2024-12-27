const nodemailer = require("nodemailer");

const sendAdminEmail = async (subject, text) => {
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
            from: process.env.EMAIL,
            to: "brittovincent007@gmail.com",
            subject: `${process.env.COMPANY_NAME} - ${subject}`,
            html: text,
        });

        console.log("email has been sent");
    } catch (error) {
        console.log(error);
        console.log("E-mail not sent");
    }
};

module.exports = sendAdminEmail;
