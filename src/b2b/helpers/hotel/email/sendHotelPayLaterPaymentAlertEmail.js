const { B2bHotelOrder } = require("../../../models/hotel");
const { sendEmail } = require("../../../../helpers");

const companyLogo = process.env.COMPANY_LOGO;
const companyRegName = process.env.COMPANY_REGISTRATION_NAME;
const b2bWebUrl = process.env.B2B_WEB_URL;

const sendHotelPayLaterPaymentAlertEmail = async ({ orderId }) => {
    try {
        const hotelOrder = await B2bHotelOrder.findById(orderId)
            .populate("hotel", "hotelName")
            .populate("reseller", "name email")
            .select("hotel reseller paymentState status referenceNumber lastDateForPayment")
            .lean();

        const date1 = new Date();
        const date2 = new Date(hotelOrder?.lastDateForPayment);
        const diffTime = Math.abs(date2 - date1);
        const expireInDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (
            hotelOrder &&
            hotelOrder.paymentState !== "fully-paid" &&
            hotelOrder.status !== "cancelled" &&
            expireInDays >= 0
        ) {
            const subject = `Action Required: Complete Your Hotel Order Payment - ${hotelOrder?.referenceNumber}`;
            const body = `<span>Dear ${hotelOrder?.reseller?.name}</span><br />
            <br />
            <span>Hope this message finds you well. We noticed your pending payment 
            for your upcoming stay at ${hotelOrder?.hotel?.hotelName}. To ensure a smooth experience, 
            kindly complete your payment at your earliest convenience. If not received 
            within ${expireInDays} days, your order will be automatically cancelled.</span><br />
            <br />
            <span>Complete Payment Now: ${b2bWebUrl}/hotel/order/${orderId}/details</span><br />
            <br />
            <span>If you have already settled the payment, please ignore this reminder.</span><br />
            <br />
            <br />
            <span>Thanks and regards</span><br />
            <span>${companyRegName}</span><br />
            <img src="${companyLogo}" width="150" />
            `;

            await sendEmail(hotelOrder?.reseller?.email, subject, body);
        }
    } catch (err) {
        console.log(err);
    }
};

module.exports = sendHotelPayLaterPaymentAlertEmail;
