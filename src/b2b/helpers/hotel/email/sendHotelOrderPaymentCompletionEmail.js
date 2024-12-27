const { sendEmail } = require("../../../../helpers");
const { formatDate } = require("../../../../utils");
const { B2bHotelOrder } = require("../../../models/hotel");

const companyLogo = process.env.COMPANY_LOGO;
const companyRegName = process.env.COMPANY_REGISTRATION_NAME;

const sendHotelOrderPaymentCompletionEmail = async ({ orderId }) => {
    try {
        const hotelOrder = await B2bHotelOrder.findById(orderId)
            .populate("hotel", "hotelName")
            .populate("reseller", "name email")
            .select("hotel reseller referenceNumber fromDate toDate")
            .lean();

        const email = hotelOrder?.reseller?.email;
        const subject = `Payment completion for hotel order ${hotelOrder?.referenceNumber}`;
        sendEmail(
            email,
            subject,
            `
        <span>Dear ${hotelOrder?.reseller?.name}</span><br />
        <br />
        <span>You have successfully completed payment for below hotel order.</span><br />
        <br />
        <ul>
            <li>Order Number: ${hotelOrder?.referenceNumber}</li>
            <li>Reservation Details: ${hotelOrder?.hotel?.hotelName}, ${formatDate(
                hotelOrder?.fromDate
            )}, ${formatDate(hotelOrder?.toDate)}</li>
        </ul>
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

module.exports = sendHotelOrderPaymentCompletionEmail;
