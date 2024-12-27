const { WhatsappManagement, Country } = require("../../models");
const { sendMessageHelper } = require("../../config/whatsappConfig");

const visaEnquireyWhatsappHelper = async ({ newVisaEnquirey }) => {
    try {
        const whatsappManagment = await WhatsappManagement.findOne({
            name: "visa",
            status: true,
        });

        const country = await Country.findOne({ _id: newVisaEnquirey.nationality });

        if (whatsappManagment) {
            sendMessageHelper({
                type: "message",
                number: `${whatsappManagment?.phoneCode}${whatsappManagment?.phoneNumber}`,
                message: `New Enquirey Request \nName : ${newVisaEnquirey.name} \nNationality : ${country?.countryName} \nEmail : ${newVisaEnquirey.email} \nWhatsappNo : ${newVisaEnquirey.whatsapp} \nMessage : ${newVisaEnquirey.message}`,
            });
        }
    } catch (e) {
        console.log(e);
    }
};

module.exports = { visaEnquireyWhatsappHelper };
