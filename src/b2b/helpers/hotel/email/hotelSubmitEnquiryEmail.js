const { sendEmail } = require("../../../../helpers");
const { formatDate } = require("../../../../utils");
const { AdminB2bAccess } = require("../../../../models");
const { B2BHotelRequest } = require("../../../models/hotel");

const companyLogo = process.env.COMPANY_LOGO;
const companyRegName = process.env.COMPANY_REGISTRATION_NAME;

const hotelSubmitEnquiryEmail = async ({ hotelEnquiryId }) => {
    try {
        const hotelRequest = await B2BHotelRequest.findById(hotelEnquiryId)
            .populate({
                path: "hotel",
                populate: {
                    path: "country state city",
                },
                select: "hotelName country state city starCategory",
            })
            .populate("roomType", "roomName")
            .populate("boardType", "boardName boardShortName")
            .populate({
                path: "reseller",
                populate: { path: "referredBy", select: "_id companyName email" },
                select: "_id role companyName email referredBy",
            })
            .lean();

        if (!hotelRequest) {
            throw new Error("Hotel request not found");
        }

        function sendReservationEmail(email, sendTo) {
            const subject = `Please help in confirming - New Booking from ${
                hotelRequest?.reseller?.companyName
            } for ${hotelRequest?.hotel?.hotelName} - Reference : ${
                hotelRequest?.b2bHotelRequestId || "N/A"
            }`;
            sendEmail(
                email,
                subject,
                `<div style="">
                <span>Hello,</span><br />
                <span>We kindly request that you process the booking in accordance with the details provided below.</span>
                <br />
                <br />
        
                <table style="min-width: 650px; border-collapse: collapse; font-size: 14px">
                    <tbody>
                        <tr>
                            <td style="border: 1px solid #333; padding: 4px; width: 200px">Reference No</td>
                            <td style="border: 1px solid #333; font-weight: 600; padding: 4px">
                                ${hotelRequest?.b2bHotelRequestId || "N/A"}
                            </td>
                        </tr>
                    </tbody>
                </table>
                <br />
        
                <table style="min-width: 650px; border-collapse: collapse; font-size: 14px">
                    <tbody>
                        <tr>
                            <td style="border: 1px solid #333; padding: 4px; width: 200px">
                                Check In Date
                            </td>
                            <td style="border: 1px solid #333; font-weight: 600; padding: 4px">
                                ${formatDate(hotelRequest?.fromDate)}
                            </td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #333; padding: 4px; width: 200px">
                                Check Out Date
                            </td>
                            <td style="border: 1px solid #333; font-weight: 600; padding: 4px">
                                ${formatDate(hotelRequest?.toDate)}
                            </td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #333; padding: 4px; width: 200px">
                                No. Of Adults
                            </td>
                            <td style="border: 1px solid #333; font-weight: 600; padding: 4px">
                                ${hotelRequest?.totalAdults} Adults
                            </td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #333; padding: 4px; width: 200px">
                                No.Of Children
                            </td>
                            <td style="border: 1px solid #333; font-weight: 600; padding: 4px">
                                ${hotelRequest?.totalChildren} Children ${
                    hotelRequest?.totalChildren > 0
                        ? hotelRequest?.rooms
                              ?.map((item) =>
                                  item?.childrenAges?.map((age) => {
                                      tempTotalChildren--;
                                      return `${age} years${tempTotalChildren > 0 ? ", " : ""}`;
                                  })
                              )
                              .join("")
                        : ""
                }
                            </td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #333; padding: 4px; width: 200px">Hotel Name</td>
                            <td style="border: 1px solid #333; font-weight: 600; padding: 4px">
                                ${hotelRequest?.hotel?.hotelName}
                            </td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #333; padding: 4px; width: 200px">
                                Room Category
                            </td>
                            <td style="border: 1px solid #333; font-weight: 600; padding: 4px">${
                                hotelRequest?.roomType?.roomName
                            }</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #333; padding: 4px; width: 200px">No. Of Rooms</td>
                            <td style="border: 1px solid #333; font-weight: 600; padding: 4px">${
                                hotelRequest?.roomsCount
                            } Room</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #333; padding: 4px; width: 200px">
                                No. Of Nights
                            </td>
                            <td style="border: 1px solid #333; font-weight: 600; padding: 4px">${
                                hotelRequest?.noOfNights
                            } Nights</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #333; padding: 4px; width: 200px">Meal Plan</td>
                            <td style="border: 1px solid #333; font-weight: 600; padding: 4px">
                                ${hotelRequest?.boardType?.boardName}
                            </td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #333; padding: 4px; width: 200px">Market</td>
                            <td style="border: 1px solid #333; font-weight: 600; padding: 4px">${
                                hotelRequest?.nationality || "All"
                            }</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #333; padding: 4px; width: 200px">
                                Tourism Dirham
                            </td>
                            <td style="border: 1px solid #333; font-weight: 600; padding: 4px">
                                Tourism dirham will paid by guest.
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
             `
            );
        }

        let emails;
        if (process.env.NODE_ENV === "production") {
            const salesRepresentatives = await AdminB2bAccess.findOne({
                reseller:
                    hotelRequest?.reseller?.role === "reseller"
                        ? hotelRequest?.reseller?._id
                        : hotelRequest?.reseller?.referredBy?._id,
                isDeleted: false,
            })
                .populate("hotels")
                .lean();

            const salesEmailsList = salesRepresentatives?.hotels?.map((item) => {
                return item?.email;
            });

            emails =
                (salesEmailsList?.length > 0 ? salesEmailsList?.join(", ") : "") +
                ", contracting@travellerschoice.ae, accounts@travellerschoice.ae";
        } else {
            emails = "nihal@hami.live";
        }

        sendReservationEmail(emails, "dpt");
        sendReservationEmail(
            `${hotelRequest?.reseller?.email}${
                hotelRequest?.reseller?.referredBy
                    ? ", " + hotelRequest?.reseller?.referredBy?.email
                    : ""
            }`,
            "reseller"
        );
    } catch (err) {
        console.log(err);
    }
};

module.exports = hotelSubmitEnquiryEmail;
