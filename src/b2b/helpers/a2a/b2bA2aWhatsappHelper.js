const { sendMessageHelper } = require("../../../config/whatsappConfig");
const { WhatsappManagement } = require("../../../models");
const { Reseller } = require("../../models");

const a2aTicketSenderHelper = async ({ a2aOrder }) => {
    try {
        const reseller = await Reseller.findOne({ _id: a2aOrder.reseller }).populate("country");

        console.log("call reached here", "whatsapp number");
        // sendMessageHelper({
        //     type: "message",
        //     number: `${reseller.country?.phonecode}${reseller?.whatsappNumber}`,
        //     message: `OrderId : ${a2aOrder.referenceNumber} \n please click on this link to download tickets \n ${process.env.SERVER_URL}/api/v1/b2b/a2a/orders/single/ticket/${a2aOrder._id}`,
        // });

        const whatsappManagment = await WhatsappManagement.findOne({
            name: "a2a",
            status: true,
        });

        if (whatsappManagment) {
            sendMessageHelper({
                type: "message",
                number: `${whatsappManagment?.phoneCode}${whatsappManagment?.phoneNumber}`,
                message: `New A2a Created \nOrderId : ${a2aOrder.referenceNumber} \nAgentCode : ${reseller.agentCode} \nTotal Amount : ${a2aOrder.totalAmount}`,
            });
        }
        return;
    } catch (err) {
        console.log(err);
    }
};

module.exports = { a2aTicketSenderHelper };
