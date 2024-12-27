const { B2bHotelOrder } = require("../../../b2b/models/hotel");
const { sendEmail } = require("../../../helpers");
const { formatDate } = require("../../../utils");

const companyLogo = process.env.COMPANY_LOGO;
const companyRegName = process.env.COMPANY_REGISTRATION_NAME;

const sendHotelPayLaterOrderCancelEmailToAdmin = async ({ orderId }) => {
    try {
        const hotelOrder = await B2bHotelOrder.findById(orderId)
            .populate("hotel", "hotelName")
            .populate("reseller", "name email")
            .select(
                "hotel reseller paymentState status referenceNumber lastDateForPayment fromDate toDate"
            )
            .lean();

        const date1 = new Date();
        const date2 = new Date(hotelOrder?.lastDateForPayment);
        const diffTime = Math.abs(date2 - date1);
        const expireInDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (
            hotelOrder &&
            hotelOrder.paymentState !== "fully-paid" &&
            hotelOrder.status !== "cancelled" &&
            expireInDays < 0
        ) {
            // TODO:
            // update this email
            const email = "nihal@hami.live";
            const subject = `Action Required: Cancel Hotel Order ${hotelOrder?.referenceNumber}`;
            const body = `<span>Dear,</span><br />
                <br />
                <span>I hope this message finds you well. We regret to inform you that the customer with the following details:</span><br />
                <br />
                <ul>
                    <li>Customer Name: ${hotelOrder?.reseller?.name}</li>
                    <li>Order Number: ${hotelOrder?.referenceNumber}</li>
                    <li>Reservation Details: ${hotelOrder?.hotel?.hotelName}, ${formatDate(
                hotelOrder?.fromDate
            )}, ${formatDate(hotelOrder?.toDate)}</li>
                </ul>
                <br />
                <span>has not completed the payment for their hotel reservation within the 
                specified timeframe. Despite our reminders, the payment remains outstanding.</span><br />
                <br />
                <span>Considering the circumstances, we kindly request the cancellation of the 
                aforementioned order to free up the inventory for other potential guests.</span><br />
                <br />
                <br />
                <span>Thanks and regards</span><br />
                <span>${companyRegName}</span><br />
                <img src="${companyLogo}" width="150" />`;

            await sendEmail(email, subject, body);
        }
    } catch (err) {
        console.log(err);
    }
};

module.exports = sendHotelPayLaterOrderCancelEmailToAdmin;
