const { sendEmail } = require("../../../../helpers");
const moment = require("moment");

const hotelPromotionExpiryMail = (promotions) => {
    const groupedPromotions = promotions.reduce((acc, promotion) => {
        const existingHotelGroup = acc.find((group) => group.hotelId === promotion?.hotel?._id);
        if (existingHotelGroup) {
            existingHotelGroup.promotions.push(promotion);
        } else {
            acc.push({
                hotelId: promotion?.hotel?._id,
                hotelName: promotion?.hotel?.hotelName,
                promotions: [promotion],
            });
        }
        return acc;
    }, []);
    let hotelRows = "";

    groupedPromotions.forEach((hotel) => {
        const { promotions, hotelName } = hotel;
        const rows = promotions
            .map(
                (
                    { name, promotionCode, sellFrom, sellTo, bookingWindowFrom, bookingWindowTo },
                    index
                ) => {
                    const prom = `<td style="border: solid 1px #DDEEEE; color: #333; padding: 10px; text-shadow: 1px 1px 1px #fff;">${name}</td>
                          <td style="border: solid 1px #DDEEEE; color: #333; padding: 10px; text-shadow: 1px 1px 1px #fff;">${promotionCode}</td>
                          <td style="border: solid 1px #DDEEEE; color: #333; padding: 10px; text-shadow: 1px 1px 1px #fff;">${moment(
                              sellFrom
                          )?.format("ddd MMM DD YYYY")}</td>
                          <td style="border: solid 1px #DDEEEE; color: #333; padding: 10px; text-shadow: 1px 1px 1px #fff;">${moment(
                              sellTo
                          )?.format("ddd MMM DD YYYY")}</td>
                          <td style="border: solid 1px #DDEEEE; color: #333; padding: 10px; text-shadow: 1px 1px 1px #fff;">${moment(
                              bookingWindowFrom
                          )?.format("ddd MMM DD YYYY")}</td>
                          <td style="border: solid 1px #DDEEEE; color: #333; padding: 10px; text-shadow: 1px 1px 1px #fff;">${moment(
                              bookingWindowTo
                          )?.format("ddd MMM DD YYYY")}</td>`;

                    if (index === 0) {
                        return `<tr>
                            <td rowspan="${promotions.length}" style="border: solid 1px #DDEEEE; color: #333; padding: 10px; text-shadow: 1px 1px 1px #fff;">${hotelName}</td>
                            ${prom}
                        </tr>`;
                    } else {
                        return `<tr>${prom}</tr>`;
                    }
                }
            )
            .join("");
        hotelRows += rows;
    });

    const format = hotelRows && generateBody(hotelRows);
    const emails = process.env.PROMOTIONS_EXPIRY_SENT_EMAILS;

    if (format && emails) {
        const { subject, body } = format;

        sendEmail(emails, subject, body);
    }

    function generateBody(rows) {
        const subject = `Reminder: Expiry of Hotel Promotion`;

        const table = `<table style="border: solid 2px #DDEEEE; border-collapse: collapse; border-spacing: 0; font: normal 14px Roboto, sans-serif;">
          <thead>
            <tr style="background-color: #DDEFEF; border: solid 1px #DDEEEE; color: #336B6B; text-align: left; text-shadow: 1px 1px 1px #fff;">
              <th style="padding: 10px;">Hotel Name</th>
              <th style="padding: 10px;">Promotion Name</th>
              <th style="padding: 10px;">Promotion Code</th>
              <th style="padding: 10px;">Sell From</th>
              <th style="padding: 10px;">Sell To</th>
              <th style="padding: 10px;">Booking Window From</th>
              <th style="padding: 10px;">Booking Window To</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        `;

        const body = `<span style="font: normal 20px Roboto, sans-serif; font-size: 16px;">Dear Team,</span><br>
        <span style="font: normal 20px Roboto, sans-serif; font-size: 16px;">Below listed hotel promotions will expiring soon.</span><br><br>
       ${table}
       <br><span style="font: normal 20px Roboto, sans-serif; font-size: 16px;">Please make sure to communicate this to any relevant parties and plan accordingly.</span><br>
       <span style="font: normal 20px Roboto, sans-serif; font-size: 16px;">System Generated Email.</span>`;
        return {
            subject,
            body,
        };
    }
};

module.exports = {
    hotelPromotionExpiryMail,
};
