const puppeteer = require("puppeteer");
const path = require("path");
const { formatDate } = require("../../../utils");

const companyLogo = process.env.COMPANY_LOGO;

const createHotelVoucher = async ({ hotelOrder }) => {
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
        await page.addStyleTag({ path: path.join(__dirname, "styles/hotelVoucher.css") });
        const pdfBuffer = await page.pdf(options);
        await browser.close();
        return pdfBuffer;
    }

    let ticketHtmlDoc = `
    <div class="container">
    <div class="py-4 pt-0 bottom-hr">
        <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
            <img src="${companyLogo}" width="150" />
        </div>
        <div class="header">
            <h1>Hotel Confirmation Voucher</h1>
        </div>
        <span class="date-txt">${
            hotelOrder?.createdAt ? formatDate(hotelOrder?.createdAt) : "N/A"
        }</span>
    </div>
    <div class="bottom-hr guest-wrapper">
        <p>Booking Id</p>
        <p>:</p>
        <p>${hotelOrder?.hotelBookingId}</p>
    </div>
    <div class="py-4 bottom-hr details-wrapper">
        <h3>${hotelOrder?.hotel?.hotelName}</h3>
        <table>
            <tbody>
                <tr>
                    <td>
                        <ul>
                            <li class="capitalize">${hotelOrder?.hotel?.address} - ${
        hotelOrder?.hotel?.postalCode
    }</li>
                            <li class="capitalize">${hotelOrder?.hotel?.city?.cityName}, ${
        hotelOrder?.hotel?.state?.stateName
    }, ${hotelOrder?.hotel?.country?.countryName}</li>
                            <li class="capitalize">Phone Number: ${
                                hotelOrder?.hotel?.hotelContact?.hotelContacts[0]?.phoneNumber ||
                                "N/A"
                            }</li>
                            <li class="capitalize">GMS: ${hotelOrder?.hotel?.geoCode?.latitude}, ${
        hotelOrder?.hotel?.geoCode?.longitude
    }</li>
                        </ul>
                    </td>
                    <td>
                        <p class="checkInLabel">Check IN</p>
                        <p class="checkIn">${
                            hotelOrder?.fromDate ? formatDate(hotelOrder?.fromDate) : "N/A"
                        }</p>
                    </td>
                    <td>
                        <p class="checkInLabel">Check OUT</p>
                        <p class="checkIn">${
                            hotelOrder?.toDate ? formatDate(hotelOrder?.toDate) : "N/A"
                        }</p>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
    <div class="py-4 bottom-hr details-table">
        <div class="details-table-container">
        <div>
            <table>
                <tbody>
                    <tr>
                        <td>Hotel Booking Id</td>
                        <td class="p-7">:</td>
                        <td class="p-7">${hotelOrder?.hotelBookingId}</td>
                    </tr>
                    <tr>
                        <td>Reference Number</td>
                        <td class="p-7">:</td>
                        <td class="p-7">${hotelOrder?.referenceNumber}</td>
                    </tr>
                    <tr>
                        <td>Star Category</td>
                        <td class="p-7">:</td>
                        <td class="p-7 capitalize">${hotelOrder?.hotel?.starCategory} ${
        hotelOrder?.hotel?.starCategory !== "apartment" ? "star" : ""
    }</td>
                    </tr>
                    <tr>
                        <td>Accomodation Type</td>
                        <td class="p-7">:</td>
                        <td class="p-7">${
                            hotelOrder?.hotel?.accommodationType?.accommodationTypeName
                        }</td>
                    </tr>
                    <tr>
                        <td>Rooms Count</td>
                        <td class="p-7">:</td>
                        <td class="p-7">${hotelOrder?.roomsCount}</td>
                    </tr>
                    ${
                        hotelOrder?.addOnSupplements?.length > 0 ||
                        hotelOrder?.mandatoryAddOns?.length > 0
                            ? `<tr>
                                <td>Inclusions</td>
                                <td class="p-7">:</td>
                                <td class="p-7">
                                    ${
                                        hotelOrder?.mandatoryAddOns
                                            ? hotelOrder?.mandatoryAddOns
                                                  ?.map((addOn) => {
                                                      return `<li>
                                    ${addOn?.addOnName} - (
                                    ${addOn?.dates?.map(
                                        (date) =>
                                            `<span>
                                            ${formatDate(date)}
                                            ${dtIndex !== addOn?.dates?.length - 1 ? ", " : ""}
                                        </span>`
                                    )}
                                    )
                                </li>`;
                                                  })
                                                  .join("")
                                            : ""
                                    }
                                    ${hotelOrder?.addOnSupplements
                                        ?.map((addOn) => {
                                            return `<li>${addOn?.addOnName} - (all days)</li>`;
                                        })
                                        .join("")}
                                </td>
                            </tr>`
                            : ""
                    }
                </tbody>
            </table>
        </div>
        <div>
            <table>
                <tbody>
                    <tr>
                        <td>Room Type</td>
                        <td class="p-7">:</td>
                        <td class="p-7 capitalize">${hotelOrder?.roomType?.roomName}</td>
                    </tr>
                    <tr>
                        <td>Board Type</td>
                        <td class="p-7">:</td>
                        <td class="p-7 capitalize">${hotelOrder?.boardType?.boardName} (${
        hotelOrder?.boardType?.boardShortName
    })</td>
                    </tr>
                    ${hotelOrder?.rooms
                        ?.map((item, index) => {
                            return `<tr>
                        <td>Room ${index + 1}</td>
                        <td class="p-7">:</td>
                        <td class="p-7">${item?.noOfAdults} Adult / ${item?.noOfChildren} Child ${
                                item?.childrenAges?.length > 0
                                    ? `(${item?.childrenAges
                                          ?.map((age) => `${age} years, `)
                                          .join("")})`
                                    : ""
                            }</td>
                    </tr>`;
                        })
                        .join("")}
                </tbody>
            </table>
        </div>
        </div>
    </div>
    <div class="py-4 bottom-hr traveller-details-wrapper">
        <div class="w-100">
            <h3>Traveller Details</h3>
            <ul>
            ${hotelOrder?.travellerDetails
                ?.map((item, index) => {
                    return `<li class="capitalize"><span>Room ${index + 1} :</span> ${
                        item?.title
                    } ${item?.firstName} ${item?.lastName}</li>`;
                })
                .join("")}
            </ul>
        </div>
        <div class="w-100">
            <h3>Contact Details</h3>
            <ul>
                <li><span>Email :</span> ${hotelOrder?.contactDetails?.email}</li>
                <li><span>Phone :</span> ${hotelOrder?.contactDetails?.country?.phonecode} ${
        hotelOrder?.contactDetails?.phoneNumber
    }</li>
            </ul>
        </div>
    </div>
    <div class="py-4 bottom-hr add-info-wrapper">
        <h3>Remarks</h3>
        <ul>
            ${
                hotelOrder?.rateComments
                    ? hotelOrder?.rateComments
                          ?.map((item) => {
                              return `<li><b>Rate Comments</b>: ${item}</li>`;
                          })
                          .join("")
                    : ""
            }
            <li>
                Payable through ${
                    hotelOrder?.supplierName
                }, acting as agent for the service operating company, details of
                which can be provided upon request. VAT: ${hotelOrder?.vatNumber} Reference: ${
        hotelOrder?.hotelBookingId
    }
            </li>
        </ul>
    </div>
    <div class="py-4">
        <p class="congtz-text">
            Congratulations!.You have just booked Hotel from us. This hotel (${
                hotelOrder?.hotel?.hotelName
            })
            has been inspected with an exhaustive check list and certified on delivering a delightful stay.
        </p>
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

module.exports = { createHotelVoucher };
