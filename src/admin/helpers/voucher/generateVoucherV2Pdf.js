const puppeteer = require("puppeteer");
const path = require("path");
const moment = require("moment");

const { formatDate } = require("../../../utils");

const generateVoucherV2Pdf = async ({ voucher, dateTime }) => {
    let combinedHtmlDoc = "";
    let options = {
        format: "A4",
        type: "buffer",
    };

    async function generatePdfAsBuffer(htmlContent, options) {
        // const browser = await puppeteer.launch();
        let browser = process?.env?.PRODUCTION
            ? await puppeteer.launch({
                  executablePath: "/usr/bin/chromium-browser",
                  args: [
                      "--disable-gpu",
                      "--disable-setuid-sandbox",
                      "--no-sandbox",
                      "--no-zygote",
                  ],
              })
            : await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(htmlContent);
        await page.addStyleTag({ path: path.join(__dirname, "styles/voucherStyle.css") });
        const pdfBuffer = await page.pdf(options);
        await browser.close();
        return pdfBuffer;
    }

    let ticketHtmlDoc = `<div class="container">
    <span class="date-txt">${dateTime}</span>
    <div class="page">
        <div class="image-container">
            <img
                src="${process.env.COMPANY_LOGO}"
                alt="logo"
                class="logo-image"
            />
        </div>
        <h1 class="heading">CONFIRMATION VOUCHER</h1>
        <div class="top-table-container">
            <table>
                <tbody>
                    <tr>
                        <td>NAME OF THE PASSENGER</td>
                        <td>${voucher?.passengerName}</td>
                    </tr>
                    <tr>
                        <td>TOTAL NO. OF PAX</td>
                        <td>${voucher?.noOfAdults} Adults${
        voucher?.noOfChildren
            ? ` + ${voucher?.noOfChildren} Children (${voucher?.childrenAges
                  ?.map(
                      (age, index) =>
                          `${age}${index < voucher?.childrenAges?.length - 1 ? ", " : ""}`
                  )
                  .join("")})`
            : ""
    }${
        voucher?.noOfInfants
            ? ` + ${voucher?.noOfInfants} Infants (${voucher?.infantAges
                  ?.map(
                      (age, index) => `${age}${index < voucher?.infantAges?.length - 1 ? ", " : ""}`
                  )
                  .join("")})`
            : ""
    }</td>
                    </tr>
                    <tr>
                        <td>REF NO</td>
                        <td>${voucher?.referenceNumber}</td>
                    </tr>
                    <tr>
                        <td>DAILY BUFFET BREAKFAST</td>
                        <td>${voucher?.buffetBreakfast ? voucher?.buffetBreakfast : "N/A"}</td>
                    </tr>
                    <tr>
                        <td>BASIS OF TRANSFER</td>
                        <td>${voucher?.basisOfTransfer ? voucher?.basisOfTransfer : "N/A"}</td>
                    </tr>
                    <tr class="border-thicker">
                        <td>ARRIVAL AIRPORT TRANSFER</td>
                        <td>
                            Guests need to proceed to the Exit Gate & look the Name of.......
                            <span class="arrival-guest-name">${voucher?.pagingName}</span>
                        </td>
                    </tr>
                    <tr class="">
                        <td colspan="2" class="tick-border">
                            <span class="contact-info-heading">EMERGENCY CONTACT NO.</span>
                            <span class="contact-info">${voucher?.contactName} ${
        voucher?.contactNumber
    }</span>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2">
                            <p class="">${voucher?.printNote}</p>
                        </td>
                    </tr>
                    ${
                        voucher?.arrivalNote
                            ? `<tr>
                    <td class="tick-border">ARRIVAL AT</td>
                    <td class="tick-border font-600">${voucher?.arrivalNote}</td>
                </tr>`
                            : ""
                    }
                    
                </tbody>
            </table>
        </div>

        ${
            voucher?.hotels?.length > 0
                ? `<div class="top-table-container">
        ${voucher?.hotels
            ?.map((hotel) => {
                return `
                <table>
                <tbody>
                    <tr>
                        <td>Hotel Name</td>
                        <td>${hotel?.hotelName}</td>
                    </tr>
                    <tr>
                        <td>Confirmation Number</td>
                        <td>${hotel?.confirmationNumber ? hotel?.confirmationNumber : "N/A"}</td>
                    </tr>
                    <tr>
                        <td>Checkin & Checkout</td>
                        <td>${formatDate(hotel?.checkInDate)} - ${formatDate(
                    hotel?.checkOutDate
                )}</td>
                    </tr>
                    <tr>
                        <td>Checkin Note</td>
                        <td>${hotel?.checkInNote ? hotel?.checkInNote : "N/A"}</td>
                    </tr>
                    <tr>
                        <td>Checkout Note</td>
                        <td>${hotel?.checkOutNote ? hotel?.checkOutNote : "N/A"}</td>
                    </tr>
                    <tr>
                        <td>Room Details</td>
                        <td>${hotel?.roomDetails ? hotel?.roomDetails : "N/A"}</td>
                    </tr>
                    <tr>
                        <td>No Of Rooms</td>
                        <td>${hotel?.noOfRooms ? hotel?.noOfRooms : "N/A"}</td>
                    </tr>
                </tbody>
            </table>`;
            })
            .join("")}
            </div>`
                : ""
        }
        
    </div>
   
    <div class="p-30">
        <div class="tours-table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>TOUR SCHEDULE</th>
                        <th>DATE</th>
                        <th>PICK FROM</th>
                        <th>PICK UP TIME</th>
                        <th>RETURN TIME</th>
                    </tr>
                </thead>
                <tbody>
                    ${voucher?.tours
                        ?.map((item, index) => {
                            return `<tr>
                        <td>${index + 1}</td>
                        <td>${item?.tourName}</td>
                        <td class="whitespace-nowrap">${
                            item?.date ? formatDate(item?.date) : "N/A"
                        }</td>
                        <td>${item?.pickupFrom ? item?.pickupFrom : "N/A"}</td>
                        <td class="whitespace-nowrap">${
                            item?.pickupISODateTime
                                ? moment(item?.pickupISODateTime)
                                      .utcOffset(item?.utcOffset)
                                      .format("HH:mm")
                                : "N/A"
                        } -  ${
                                item?.pickupISOToDateTime
                                    ? moment(item.pickupISOToDateTime)
                                          .utcOffset(item.utcOffset)
                                          .format("HH:mm")
                                    : "N/A"
                            }</td>
                        <td>
                        ${
                            item?.returnISODateTime
                                ? moment(item.returnISODateTime)
                                      .utcOffset(item.utcOffset)
                                      .format("HH:mm")
                                : "N/A"
                        }
                        </td>
                    </tr>`;
                        })
                        .join("")}
                </tbody>
            </table>
            ${
                voucher?.departureNote
                    ? `<div class="departure-wrapper">
            <div>DEPARTURE AT</div>
            <div>${voucher?.departureNote}</div>
        </div>`
                    : ""
            }
            
        </div>
        <div class="last-page-wrapper">
            ${voucher?.termsAndConditions}
        </div>
    </div>
</div>`;
    combinedHtmlDoc += ticketHtmlDoc;

    try {
        const pdfBuffer = await generatePdfAsBuffer(combinedHtmlDoc, options);
        return pdfBuffer;
    } catch (err) {
        throw err;
    }
};

module.exports = generateVoucherV2Pdf;
