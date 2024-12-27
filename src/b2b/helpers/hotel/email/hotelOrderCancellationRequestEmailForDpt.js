const { sendEmail } = require("../../../../helpers");
const { AdminB2bAccess } = require("../../../../models");

const companyLogo = process.env.COMPANY_LOGO;
const companyRegName = process.env.COMPANY_REGISTRATION_NAME;

const hotelOrderCancellationRequestEmailForDpt = async ({ mainAgentId, name, referenceNumber }) => {
    try {
        let emails;
        if (process.env.NODE_ENV === "production") {
            const salesRepresentatives = await AdminB2bAccess.findOne({
                reseller: mainAgentId,
                isDeleted: false,
            })
                .populate("hotels", "email")
                .lean();

            const salesEmailsList = salesRepresentatives?.hotels?.map((item) => {
                return item?.email;
            });

            emails =
                (salesEmailsList?.length > 0 ? salesEmailsList?.join(", ") : "") +
                ", contracting@travellerschoice.ae, accounts@travellerschoice.ae";
        } else {
            emails = `nihal@hami.live`;
        }

        const subject = `Cancellation of hotel order ${referenceNumber}`;
        sendEmail(
            emails,
            subject,
            `
        <span>Hi Team</span><br />
        <br />
        <span>Cancellation notice - ${name} has submitted a request for cancellation of the ${referenceNumber}</span><br />
        <span>Please take over and process internally and with the hotel. Please write separately to the hotel if there are any cancellation charges applicable or not. Please update the system accordingly.</span><br />
        
        <br />
        <br />
        <span>Thanks and regards</span><br />
        <span>${companyRegName}</span><br />
        <img src="${companyLogo}" width="150" />
        `
        );
    } catch (err) {
        console.log(err);
    }
};

module.exports = hotelOrderCancellationRequestEmailForDpt;
