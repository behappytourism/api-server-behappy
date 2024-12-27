const puppeteer = require("puppeteer");
const path = require("path");

const { convertMinutesTo12HourTime, formatDate } = require("../../../utils");

const generateVoucherPdf = async ({ voucher, dateTime }) => {
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
                        <td>NAME OF HOTEL / APARTMENTS</td>
                        <td>${voucher?.hotelName ? voucher?.hotelName : "N/A"}</td>
                    </tr>
                    <tr>
                        <td>CONFIRMATION NUMBER</td>
                        <td>${
                            voucher?.confirmationNumber ? voucher?.confirmationNumber : "N/A"
                        }</td>
                    </tr>
                    <tr>
                        <td>REF NO</td>
                        <td>${voucher?.referenceNumber}</td>
                    </tr>
                    <tr>
                        <td>CHECK IN DATE</td>
                        <td>${voucher?.checkInDate ? formatDate(voucher?.checkInDate) : "N/A"}</td>
                    </tr>
                    <tr>
                        <td>NOTE</td>
                        <td>${voucher?.checkInNote ? voucher?.checkInNote : "N/A"}</td>
                    </tr>
                    <tr>
                        <td>CHECK OUT DATE</td>
                        <td>${
                            voucher?.checkOutDate ? formatDate(voucher?.checkOutDate) : "N/A"
                        }</td>
                    </tr>
                    <tr>
                        <td>NOTE</td>
                        <td>${voucher?.checkOutNote ? voucher?.checkOutNote : "N/A"}</td>
                    </tr>
                    <tr>
                        <td>ROOM DETAILS</td>
                        <td>${voucher?.roomDetails ? voucher?.roomDetails : "N/A"}</td>
                    </tr>
                    <tr>
                        <td>NO OF ROOMS</td>
                        <td>${voucher?.noOfRooms ? voucher?.noOfRooms : "N/A"}</td>
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
    }</span
                            >
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
                            !isNaN(item?.pickupTimeFrom) && item?.pickupTimeFrom !== null
                                ? convertMinutesTo12HourTime(item?.pickupTimeFrom)
                                : "N/A"
                        } -  ${
                                !isNaN(item?.pickupTimeTo) && item?.pickupTimeTo !== null
                                    ? convertMinutesTo12HourTime(item?.pickupTimeTo)
                                    : "N/A"
                            }</td>
                        <td>
                        ${
                            !isNaN(item?.returnTimeFrom) && item?.returnTimeFrom !== null
                                ? convertMinutesTo12HourTime(item?.returnTimeFrom)
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

module.exports = generateVoucherPdf;
