const { sendMessageHelper } = require("../../../config/whatsappConfig");
const { WhatsappManagement } = require("../../../models");
const { Reseller } = require("../../models");

const whatsappTicketSenderHelper = async ({ attractionOrder }) => {
    try {
        const reseller = await Reseller.findOne({ _id: attractionOrder.reseller }).populate(
            "country"
        );

        // if (reseller?.whatsappNumber) {
        //     console.log(reseller.whatsappNumber, "whatsapp number");
        //     for (let i = 0; i < attractionOrder?.activities?.length; i++) {
        //         let activity = attractionOrder.activities[i];
        //         console.log("call reached here", "whatsapp number");
        //         sendMessageHelper({
        //             type: "message",
        //             number: `${reseller.country?.phonecode}${reseller?.whatsappNumber}`,
        //             message: `OrderId : ${attractionOrder.referenceNumber} \n please click on this link to download tickets \n ${process.env.SERVER_URL}/api/v1/b2b/attractions/orders/${attractionOrder._id}/ticket/${activity._id}`,
        //         });
        //     }
        // }

        const whatsappManagment = await WhatsappManagement.findOne({
            name: "attraction",
            status: true,
        });

        if (whatsappManagment) {
            sendMessageHelper({
                type: "message",
                number: `${whatsappManagment?.phoneCode}${whatsappManagment?.phoneNumber}`,
                message: `New Attraction Order Created \n OrderId : ${attractionOrder.referenceNumber} \n AgentCode : ${reseller.agentCode} \n Total Amount : ${attractionOrder.totalAmount}`,
            });
        }
        return;
    } catch (err) {
        console.log(err);
    }
};

module.exports = { whatsappTicketSenderHelper };
