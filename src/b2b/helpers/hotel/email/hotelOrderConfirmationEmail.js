const nodemailer = require("nodemailer");

const { formatDate } = require("../../../../utils");
const createB2bHotelOrderInvoice = require("../createB2bHotelOrderInvoice");
const { createHotelVoucher } = require("../hotelVoucherHelpers");
const { B2bHotelOrder } = require("../../../models/hotel");

const companyLogo = process.env.COMPANY_LOGO;
const companyRegName = process.env.COMPANY_REGISTRATION_NAME;

const hotelOrderConfirmationEmail = async ({ orderId }) => {
    try {
        const hotelOrder = await B2bHotelOrder.findOne({
            _id: orderId,
        })
            .populate("reseller", "email name")
            .populate({
                path: "hotel",
                populate: {
                    path: "country state city accommodationType hotelContact",
                },
            })
            .populate("roomType")
            .populate("boardType")
            .populate("contactDetails.country")
            .lean();

        const {
            fromDate,
            toDate,
            referenceNumber,
            travellerDetails,
            noOfNights,
            roomsCount,
            hotel,
            reseller,
            netPrice,
        } = hotelOrder;
        const guestName =
            travellerDetails[0]?.title +
            " " +
            travellerDetails[0]?.firstName +
            " " +
            travellerDetails[0]?.lastName;
        const subject = `Thanks! Your booking ${referenceNumber} is confirmed at ${hotel?.hotelName}`;

        const hotelInvoiceBuffer = await createB2bHotelOrderInvoice({
            orderId: hotelOrder?._id,
            resellerId: reseller?._id,
        });
        const hotelVoucherBuffer = await createHotelVoucher({ hotelOrder });

        const body = `
            <div>
    <div>
        <span> Great news, ${reseller?.name},</span><br />
        <br />
        <span
            >Your booking in ${hotel?.hotelName} is
            <span style="font-weight: 600; color: green">Confirmed</span>.</span
        ><br />
        <span>On arrival, please present a photo ID that matches the guest name below</span><br />
        <br />

        <table style="min-width: 650px; border-collapse: collapse; font-size: 14px">
            <tbody>
                <tr>
                    <td style="border: 1px solid #333; padding: 4px">Confirmation Number</td>
                    <td style="border: 1px solid #333; padding: 4px">${
                        hotelOrder?.hotelBookingId
                    }</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #333; padding: 4px">Booking details</td>
                    <td style="border: 1px solid #333; padding: 4px">${noOfNights} nights, ${roomsCount} rooms</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #333; padding: 4px">Guest Name</td>
                    <td style="border: 1px solid #333; padding: 4px; text-transform: capitalize;">${guestName}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #333; padding: 4px">Check-in</td>
                    <td style="border: 1px solid #333; padding: 4px">
                        ${formatDate(fromDate)} (${hotel?.checkInTime})
                    </td>
                </tr>
                <tr>
                    <td style="border: 1px solid #333; padding: 4px">Check-out</td>
                    <td style="border: 1px solid #333; padding: 4px">
                        ${formatDate(toDate)} (${hotel?.checkOutTime})
                    </td>
                </tr>
            </tbody>
        </table>

        <br />
        <table style="min-width: 650px; border-collapse: collapse; font-size: 14px">
            <tbody>
                <tr>
                    <td
                        style="
                            border: 1px solid #333;
                            padding: 4px;
                            background-color: rgb(212, 212, 212);
                        "
                    >
                        You paid
                    </td>
                    <td
                        style="
                            border: 1px solid #333;
                            padding: 4px;
                            background-color: rgb(212, 212, 212);
                            font-weight: 600;
                        "
                    >
                        ${netPrice} AED
                    </td>
                </tr>
            </tbody>
        </table>

        <br />
            <br />
            <span>Thanks and regards</span><br />
            <span>${companyRegName}</span><br />
            <img src="${companyLogo}" width="150" />
    </div>
</div>
        `;

        const transporter = nodemailer.createTransport({
            host: "smtp.travellerschoice.ae",
            port: 587,
            secure: false, // upgrade later with STARTTLS
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASSWORD,
            },
        });

        console.log(
            "Sending confirmation email to ",
            reseller?.email +
                (process.env.NODE_ENV === "production" ? ", accounts@travellerschoice.ae" : "")
        );

        await transporter.sendMail({
            from: process.env.EMAIL,
            to:
                reseller?.email +
                (process.env.NODE_ENV === "production" ? ", accounts@travellerschoice.ae" : ""),
            subject,
            html: body,
            attachments: [
                {
                    filename: "voucher.pdf",
                    content: hotelVoucherBuffer,
                    contentType: "application/pdf",
                },
                {
                    filename: "invoice.pdf",
                    content: hotelInvoiceBuffer,
                    contentType: "application/pdf",
                },
            ],
        });

        console.log("email has been sent");
    } catch (err) {
        console.log(err);
    }
};

module.exports = hotelOrderConfirmationEmail;
