const nodemailer = require("nodemailer");

const sendQtnWelcomeEmail = async ({ email, password }) => {
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
            to: `${email}, suhaib2533@gmail.com`,
            subject: "TCTT Admin panel access - Updated",
            text: `Hi,
    
    Announcing the arrival of the updated Quotation Tool. We have made a username password for you, and we expect you to start using this immediately and also give proper feedback of any errors.
    
    You are already part of the Whatsapp Group.
            
    Please note as follows:
    URL : https://login.mytravellerschoice.com/
    Email : ${email}
    Password : ${password}
            
    Please do not share these details with anyone else, this is for your use only.
    You can change password from profile -> edit profile -> change password.
            
    You can reach me on my email suhaib2533@gmail.com and / or on the
    Whatsapp group for feedback as well. You need to ensure that you check the costing - and if there are any aspects which need corrections. Costings breakdown can be cross checked from the excel sheet which can be downloaded from the admin panel.
    
    Thanks n regards,
    Suhaib T.`,
        });

        console.log(`qtn email successfully sent to ${email}`);
    } catch (err) {
        console.log("Error", email, err);
    }
};

module.exports = sendQtnWelcomeEmail;
