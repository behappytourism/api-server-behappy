const { sendEmail } = require("../../../helpers");
const { formatDate } = require("../../../utils");
const { B2bHotelOrder, B2BHotelOrderPayment } = require("../../../b2b/models/hotel");
const { AdminB2bAccess } = require("../../../models");

const companyLogo = process.env.COMPANY_LOGO;
const companyRegName = process.env.COMPANY_REGISTRATION_NAME;

const sendHotelReservationEmail = async ({ orderId }) => {
    try {
        const hotelOrder = await B2bHotelOrder.findOne({
            _id: orderId,
        })
            .populate({
                path: "hotel",
                populate: {
                    path: "country state city accommodationType",
                },
            })
            .populate("contracts.contract")
            .populate("roomType")
            .populate("boardType")
            .populate("contactDetails.country")
            .populate({
                path: "reseller",
                populate: { path: "referredBy", select: "_id companyName email" },
                select: "_id role companyName email referredBy",
            })
            .lean();

        let payments = [];
        if (hotelOrder.paymentState === "fully-paid") {
            payments = await B2BHotelOrderPayment.find({ orderId, paymentState: "success" })
                .sort({ createdAt: -1 })
                .lean();
        }

        let tempTotalChildren = hotelOrder?.totalChildren;

        const allRateCodes = [];
        hotelOrder.contracts?.map((item) => {
            if (item?.isSpecialRate === true && !allRateCodes?.includes(item.appliedRateCode)) {
                allRateCodes.push(item.appliedRateCode);
            }
        });
        hotelOrder?.appliedDiscounts?.map((item) => {
            if (!allRateCodes?.includes(item?.rateCode)) {
                allRateCodes.push(item?.rateCode);
            }
        });
        hotelOrder?.appliedStayPays?.map((item) => {
            if (!allRateCodes?.includes(item?.rateCode)) {
                allRateCodes.push(item?.rateCode);
            }
        });
        hotelOrder?.appliedMealUpgrades?.map((item) => {
            if (!allRateCodes?.includes(item?.rateCode)) {
                allRateCodes.push(item?.rateCode);
            }
        });
        hotelOrder?.appliedRoomTypeUpgrades?.map((item) => {
            if (!allRateCodes?.includes(item?.rateCode)) {
                allRateCodes.push(item?.rateCode);
            }
        });

        let filteredOccupancies = [];
        hotelOrder?.selectedRoomOccupancies?.map((occupancy) => {
            const objIndex = filteredOccupancies?.findIndex((item) => {
                return (
                    item?.shortName === occupancy?.shortName &&
                    item?.extraBedApplied === occupancy?.extraBedApplied &&
                    item?.rollBedApplied === occupancy?.rollBedApplied
                );
            });
            if (objIndex !== -1) {
                filteredOccupancies[objIndex].count += 1;
            } else {
                filteredOccupancies.push(occupancy);
            }
        });

        function sendReservationEmail(email, sendTo) {
            const subject = `New Booking from ${hotelOrder?.reseller?.companyName} for ${hotelOrder?.hotel?.hotelName} - Booking Reference : ${hotelOrder?.referenceNumber}`;
            sendEmail(
                email,
                subject,
                `<div style="">
                <span>Hello,</span><br />
                <span>${
                    sendTo === "dpt"
                        ? `We kindly request that you process the booking in accordance with the details provided below.`
                        : `Thank you for booking with us. Please find the details below .`
                }</span>
                <br />
                <br />
        
                <table style="min-width: 650px; border-collapse: collapse; font-size: 14px">
                    <tbody>
                        <tr>
                            <td style="border: 1px solid #333; padding: 4px; width: 200px">Booking Code</td>
                            <td style="border: 1px solid #333; font-weight: 600; padding: 4px">
                                ${hotelOrder?.referenceNumber}
                            </td>
                        </tr>
                    </tbody>
                </table>
                <br />
        
            <table style="min-width: 650px; border-collapse: collapse; font-size: 14px">
                <tbody>
                ${
                    allRateCodes?.length > 0 && sendTo === "dpt"
                        ? `<tr>
                <td style="border: 1px solid #333; padding: 4px; width: 200px">Rate Code</td>
                <td style="border: 1px solid #333; font-weight: 600; padding: 4px">
                    ${allRateCodes?.map(
                        (item, index) => `${item}${index < allRateCodes?.length - 1 ? ", " : ""}`
                    )}
                </td>
                </tr>`
                        : ""
                } 
                    <tr>
                        <td style="border: 1px solid #333; padding: 4px; width: 200px">Rate</td>
                        <td style="border: 1px solid #333; font-weight: 600; padding: 4px; text-transform: capitalize;">
                            ${
                                sendTo === "dpt"
                                    ? `${hotelOrder?.netPrice - hotelOrder?.totalMarkup} AED`
                                    : `${hotelOrder?.netPrice} AED`
                            }
                        </td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #333; padding: 4px; width: 200px">Payment Method</td>
                        <td style="border: 1px solid #333; font-weight: 600; padding: 4px; text-transform: capitalize;">
                            ${
                                hotelOrder?.status === "booked" &&
                                hotelOrder?.paymentState !== "fully-paid"
                                    ? `Pay Later - (pay by ${
                                          hotelOrder?.lastDateForPayment
                                              ? formatDate(hotelOrder?.lastDateForPayment)
                                              : "_"
                                      } date or the booking will stand cancelled automatically)`
                                    : payments
                                          ?.map((item, index) => {
                                              return `${index !== 0 ? ", " : ""}${
                                                  item?.paymentMethod
                                              }`;
                                          })
                                          .join("")
                            }
                        </td>
                    </tr>
                </tbody>
            </table>
            <br />
        
                <table style="min-width: 650px; border-collapse: collapse; font-size: 14px">
                    <tbody>
                        <tr>
                            <td style="border: 1px solid #333; padding: 4px; width: 200px">Guest Name</td>
                            <td style="border: 1px solid #333; font-weight: 600; padding: 4px; text-transform: capitalize;">
                                ${hotelOrder?.travellerDetails
                                    ?.map(
                                        (item, index) =>
                                            `${item?.title} ${item?.firstName} ${item?.lastName}${
                                                index < hotelOrder?.travellerDetails?.length - 1
                                                    ? ", "
                                                    : ""
                                            }`
                                    )
                                    .join("")}
                            </td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #333; padding: 4px; width: 200px">
                                Check In Date
                            </td>
                            <td style="border: 1px solid #333; font-weight: 600; padding: 4px">
                                ${formatDate(hotelOrder?.fromDate)}
                            </td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #333; padding: 4px; width: 200px">
                                Check Out Date
                            </td>
                            <td style="border: 1px solid #333; font-weight: 600; padding: 4px">
                                ${formatDate(hotelOrder?.toDate)}
                            </td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #333; padding: 4px; width: 200px">
                                No. Of Adults
                            </td>
                            <td style="border: 1px solid #333; font-weight: 600; padding: 4px">
                                ${hotelOrder?.totalAdults} Adults
                            </td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #333; padding: 4px; width: 200px">
                                No.Of Children
                            </td>
                            <td style="border: 1px solid #333; font-weight: 600; padding: 4px">
                                ${hotelOrder?.totalChildren} Children ${
                    hotelOrder?.totalChildren > 0
                        ? hotelOrder?.rooms
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
                                ${hotelOrder?.hotel?.hotelName}
                            </td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #333; padding: 4px; width: 200px">
                                Room Category
                            </td>
                            <td style="border: 1px solid #333; font-weight: 600; padding: 4px">${
                                hotelOrder?.roomType?.roomName
                            }</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #333; padding: 4px; width: 200px">Room Sharing</td>
                            <td style="border: 1px solid #333; font-weight: 600; padding: 4px">
                                ${filteredOccupancies
                                    ?.map((item, index) => {
                                        return `${item?.shortName} x ${item?.count}${
                                            item?.extraBedApplied > 0
                                                ? ` + (${item?.extraBedApplied} Extra Bed)`
                                                : ""
                                        }${
                                            item?.rollBedApplied > 0
                                                ? ` + (${item?.rollBedApplied} Roll Away Bed)`
                                                : ""
                                        }${index < filteredOccupancies?.length - 1 ? ", " : ""}`;
                                    })
                                    ?.join("")}
                            </td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #333; padding: 4px; width: 200px">No. Of Rooms</td>
                            <td style="border: 1px solid #333; font-weight: 600; padding: 4px">${
                                hotelOrder?.roomsCount
                            } Room</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #333; padding: 4px; width: 200px">
                                No. Of Nights
                            </td>
                            <td style="border: 1px solid #333; font-weight: 600; padding: 4px">${
                                hotelOrder?.noOfNights
                            } Nights</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #333; padding: 4px; width: 200px">Meal Plan</td>
                            <td style="border: 1px solid #333; font-weight: 600; padding: 4px">
                                ${hotelOrder?.boardType?.boardName}
                            </td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #333; padding: 4px; width: 200px">Market</td>
                            <td style="border: 1px solid #333; font-weight: 600; padding: 4px">${
                                hotelOrder?.nationality || "All"
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
        
                ${
                    hotelOrder?.specialRequest
                        ? `<br />
                <table style="min-width: 650px; border-collapse: collapse; font-size: 14px">
                <tbody>
                    <tr>
                        <td style="border: 1px solid #333; padding: 4px; width: 200px">Special Request</td>
                        <td style="border: 1px solid #333; padding: 4px">
                            ${hotelOrder?.specialRequest}
                        </td>
                    </tr>
                </tbody>
            </table>`
                        : ""
                }
    
            ${
                sendTo === "dpt"
                    ? `<br />
            <table style="min-width: 650px; border-collapse: collapse; font-size: 14px">
                <tbody>
                    ${hotelOrder?.contracts
                        ?.map((item) => {
                            return `<tr>
                        <td style="border: 1px solid #333; padding: 4px; width: 200px">${formatDate(
                            item?.date
                        )}</td>
                        <td style="border: 1px solid #333; font-weight: 600; padding: 4px; text-transform: capitalize;">
                            ${item?.offerAppliedPrice} AED
                        </td>
                    </tr>`;
                        })
                        ?.join("")}
                </tbody>
            </table>`
                    : ""
            }

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
                    hotelOrder?.reseller?.role === "reseller"
                        ? hotelOrder?.reseller?._id
                        : hotelOrder?.reseller?.referredBy?._id,
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
            `${hotelOrder?.reseller?.email}${
                hotelOrder?.reseller?.referredBy
                    ? ", " + hotelOrder?.reseller?.referredBy?.email
                    : ""
            }`,
            "reseller"
        );
    } catch (err) {
        console.log(err);
    }
};

module.exports = sendHotelReservationEmail;
