const nodemailer = require("nodemailer");
const moment = require("moment");

const { flightBookingPdfRequest } = require("../../b2b/helpers/b2bFlightHelper");
const { getFormatedDuration } = require("../../utils");

const companyName = process.env.COMPANY_NAME;

const sendFlightBookingEmail = async ({ flightOrder }) => {
    try {
        const text = `<style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        </style>
        <div style="margin: 30px; font-family: Arial, Helvetica, sans-serif; color: #222; font-size: 13px; line-height: 24px;">

    ${
        flightOrder?.trips?.length > 0
            ? flightOrder?.trips
                  ?.map((trip) => {
                      return `
    <div>
        <div style="margin-top: 20px; padding: 8px 12px; background-color: #d3d3d3;">
            <div style="display: flex; align-items: center;">
                <div style="display: flex; align-items: center;">
                    <h3 style="margin: 0; padding: 0; font-weight: bold; font-size: 18px;">
                        ${trip?.departureAirport} to ${trip?.arrivalAirport}
                    </h3>
                    <p style="margin: 0; padding: 0; margin-left: 15px;">
                        ${moment(trip?.flightSegments[0]?.departureDate).format("D MMM YYYY HH:mm")}
                    </p>
                </div>
            </div>
        </div>

        ${trip?.flightSegments
            ?.map((segment) => {
                return `
        <div>
            <div style="display: flex; padding-top: 12px; margin-top: 20px;">
                <div style="display: flex;">
                    <div style="font-weight: bold;">
                        <img width="30" height="30" src="${segment?.airlineLogo}" alt="" />
                        <h3 style="margin: 0; padding: 0; margin-top: 4px;;">${
                            segment?.airlineName
                        }</h3>
                        <p style="margin: 0; padding: 0; color: #5f5d5d;">${
                            segment?.flightNumber
                        }</p>
                        <p style="margin: 0; padding: 0; color: #5f5d5d;">${
                            trip?.fareDetails?.fareName || ""
                        }</p>
                    </div>

                    <div style="margin-left: 40px; align-items: center;">
                        <div style="display: flex;">
                            <h3 style="margin: 0; padding: 0; color: #144baf;">${segment?.from}</h3>
                            <h3 style="margin: 0; padding: 0; margin-left: 10px;">
                                ${moment(segment?.departureDate).format("HH:mm")}
                            </h3>
                        </div>
                        <p style="margin: 0; padding: 0; color: #5f5d5d;">
                            ${moment(segment?.departureDate).format("D MMM YYYY")}
                        </p>
                        <p style="margin: 0; padding: 0; color: #5f5d5d;">${
                            segment?.fromAirport
                        }</p>
                        <p style="margin: 0; padding: 0; color: #5f5d5d;">${
                            segment?.fromTerminal
                        }</p>
                    </div>
                </div>

                <div style="margin-left: 32px; text-align: center; padding: 10px;">
                    <div>
                        <img
                            src="https://cdn-icons-png.flaticon.com/512/109/109613.png"
                            alt="Duration Icon"
                            height="12"
                        />
                    </div>
                    <p style="margin: 0; padding: 0; color: #5f5d5d;">
                        ${getFormatedDuration(segment?.departureDate, segment?.arrivalDate)}
                    </p>
                    <p style="margin: 0; padding: 0; color: #5f5d5d;">${segment?.travelClass}</p>
                </div>

                <div style="margin-left: 32px;">
                    <div style="display: flex;">
                        <h3 style="margin: 0; padding: 0; color: #144baf;">${segment?.to}</h3>
                        <h3 style="margin: 0; padding: 0; margin-left: 10px;">
                            ${moment(segment?.arrivalDate).format("HH:mm")}
                        </h3>
                    </div>
                    <p style="margin: 0; padding: 0; color: #5f5d5d;">
                        ${moment(segment?.arrivalDate).format("D MMM YYYY")}
                    </p>
                    <p style="margin: 0; padding: 0; color: #5f5d5d;">${segment?.toAirport}</p>
                    <p style="margin: 0; padding: 0; color: #5f5d5d;">${segment?.toTerminal}</p>
                </div>
            </div>

            <div style="display: flex; align-items: center; margin-top: 20px;">
                <p>Baggage (per Adult/Child) -</p>
                <p style="margin-left: 4px; color: #333; font-weight: 600;">Cabin: ${
                    trip?.fareDetails?.cabinBaggageWeight
                }Kg</p>
            </div>

            <div>
                <table style="margin-top: 20px; width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                        <tr>
                            <th style="font-weight: 600; border: 0.4px solid rgb(199, 199, 199); text-align: left; padding: 8px;">Travellers</th>
                            <th style="font-weight: 600; border: 0.4px solid rgb(199, 199, 199); text-align: left; padding: 8px;">PNR</th>
                            ${
                                segment?.airlineCode !== 486 && segment?.airlineCode !== 141
                                    ? `
                            <th style="font-weight: 600; border: 0.4px solid rgb(199, 199, 199); text-align: left; padding: 8px;">Ticket</th>
                            `
                                    : ``
                            }
                            <th style="font-weight: 600; border: 0.4px solid rgb(199, 199, 199); text-align: left; padding: 8px;">Seat</th>
                            <th style="font-weight: 600; border: 0.4px solid rgb(199, 199, 199); text-align: left; padding: 8px;">Meal</th>
                            <th style="font-weight: 600; border: 0.4px solid rgb(199, 199, 199); text-align: left; padding: 8px;">Baggage</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${segment?.passengers
                            ?.map((passenger) => {
                                return `
                        <tr>
                            <td style="border: 0.4px solid rgb(199, 199, 199); text-align: left; padding: 8px;">
                                ${passenger?.nameTitle} ${passenger?.firstName} ${
                                    passenger?.lastName
                                }
                            </td>
                            <td style="border: 0.4px solid rgb(199, 199, 199); text-align: left; padding: 8px;">${
                                flightOrder?.bookingPNR
                            }</td>
                            ${
                                segment?.airlineCode !== 486 && segment?.airlineCode !== 141
                                    ? `
                            <td style="border: 0.4px solid rgb(199, 199, 199); text-align: left; padding: 8px;">${
                                passenger?.ticketNumber || "N/A"
                            }</td>
                            `
                                    : ``
                            }
                            <td style="border: 0.4px solid rgb(199, 199, 199); text-align: left; padding: 8px;">${
                                passenger?.seatNumber ? passenger?.seatNumber : "N/A"
                            }</td>
                            <td style="border: 0.4px solid rgb(199, 199, 199); text-align: left; padding: 8px;">
                                ${
                                    passenger?.mealRequests?.length > 0
                                        ? passenger?.mealRequests[0]?.mealInfo
                                        : "N/A"
                                }
                            </td>
                            <td style="border: 0.4px solid rgb(199, 199, 199); text-align: left; padding: 8px;">
                                ${
                                    passenger?.baggageRequests?.length > 0
                                        ? passenger?.baggageRequests[0]?.baggageInfo
                                        : "N/A"
                                }
                            </td>
                        </tr>
                        `;
                            })
                            .join("")}
                    </tbody>
                </table>
            </div>
        </div>
        `;
            })
            .join("")}
    </div>
    `;
                  })
                  ?.join("")
            : ""
    }

    <div style="margin-top: 24px;">
        <p style="font-weight: bold;">ABOUT THIS TRIP</p>
        <ul style="color: #5f5d5d; list-style-type: disc; padding-left: 20px;">
            <li>
                Note: Except for medical devices, electronic devices which are larger than a cell
                phone/smart phone cannot be carried in the cabin of the aircraft.
            </li>
            <li>
                Note: Only cell phones of dimension Length: 16cm x Width: 9.3cm x Depth: 1.5cm are
                allowed in the cabin baggage. Please carry all other electronic equipment inside
                check-in baggage.
            </li>
            <li>Use your Trip ID for all communication with ${companyName} about this booking</li>
            <li>
                Please reach the airport 4 hours before the departure time. Check-in counters at the
                airport close 90 minutes before departure
            </li>
            <li>
                Your carry-on baggage shouldn't weigh more than ${
                    flightOrder?.trips[0]?.fareDetails?.cabinBaggageWeight
                }kgs
            </li>
            <li>
                Carry photo identification, you will need it as proof of identity while checking-in
            </li>
            <li>
                Kindly ensure that you have the relevant visa, immigration clearance and travel with
                a passport, with a validity of at least 6 months.
            </li>
            <li>
                For hassle free processing, cancel/amend your tickets with ${companyName} instead of
                doing so directly with Airline
            </li>
        </ul>
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

        const pdfData = await flightBookingPdfRequest({
            referenceNumber: flightOrder?.referenceNumber,
            totalMarkup: flightOrder?.adminB2bMarkup || 0,
        });

        await transporter.sendMail({
            from: process.env.EMAIL,
            to: flightOrder?.contactDetails?.email,
            subject: `${process.env.COMPANY_NAME} - Flight Booking Confirmation #${flightOrder?.referenceNumber}`,
            html: text,
            attachments: [
                {
                    filename: "ticket.pdf",
                    content: pdfData,
                    contentType: "application/pdf",
                },
            ],
        });

        console.log("email has been sent");
    } catch (err) {
        console.log(err);
    }
};

module.exports = sendFlightBookingEmail;

{
    /* <div style="margin-top: 20px; display: flex; border: 1px solid; align-items: center; align-content: center; padding: 4px 10px;">
<div>
    <img
        src="https://cdn-icons-png.flaticon.com/128/65/65704.png"
        alt="Manage Booking Icon"
        width="24"
        height="24"
        style="object-fit: cover;"
    />
</div>
<div style="margin-left: 8px;">
    <h4 style="margin: 0; padding: 0;">Manage bookings online</h4>
    <div>
        <span>Visit</span>
        <span style="color: blue; text-decoration: underline; cursor: pointer;">mytravellerschoice.com/support</span>
    </div>
</div>
</div>

<hr />

<div style="display: flex; justify-content: space-around; margin-top: 24px;">
<div style="display: flex; align-items: center;">
    <div>
        <img
            src="https://icon-library.com/images/icon-telephone/icon-telephone-9.jpg"
            height="24px"
            alt="Air Arabia Contact Icon"
        />
    </div>
    <div style="margin-left: 10px;">
        <h4 style="margin: 0; padding: 0;">Air Arabia helpline (022) 71004777</h4>
    </div>
</div>
<div style="display: flex; align-items: center;">
    <div>
        <img
            src="https://static.thenounproject.com/png/2512607-200.png"
            height="32px"
            alt="Contact Icon"
        />
    </div>
    <div style="margin-left: 10px;">
        <h4 style="margin: 0; padding: 0;">Need Help? Call +971 48754545</h4>
    </div>
</div>
</div> */
}

{
    /* <div style="margin-top: 20px; border-top: 1px solid rgb(199, 199, 199); padding-top: 15px;">
    <p style="font-weight: bold;">FARE BREAKUP</p>
    <table style="font-size: 13px; border: none;">
        <tbody>
            <tr>
                <td style="padding: 3px; padding-left: 0px;">Base Fare</td>
                <td style="padding: 3px;">:</td>
                <td style="padding: 3px;">${flightOrder?.baseFare} AED</td>
            </tr>
            <tr>
                <td style="padding: 3px; padding-left: 0px;">Taxes and Fees</td>
                <td style="padding: 3px;">:</td>
                <td style="padding: 3px;">${flightOrder?.totalFee + flightOrder?.totalTax} AED</td>
            </tr>
            <tr>
                <td style="padding: 3px; padding-left: 0px;">Total Fare</td>
                <td style="padding: 3px;">:</td>
                <td style="padding: 3px;">${flightOrder?.netFare} AED</td>
            </tr>
        </tbody>
    </table>
</div>; */
}
