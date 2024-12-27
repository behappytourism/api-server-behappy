const puppeteer = require("puppeteer");
const path = require("path");

const { formatDate } = require("../../../utils");
const { InvoiceSettings } = require("../../../models/global");

const createB2bFlightOrderInvoice = async ({ flightOrder }) => {
    // TODO:
    // cache invoice settings
    const invoiceSettings = await InvoiceSettings.findOne({ settingsNumber: 1 })
        .populate("bankAccounts")
        .lean();
    if (!invoiceSettings) {
        throw new Error("invoice settings not found, please update");
    }

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
        await page.addStyleTag({ path: path.join(__dirname, "styles/flightOrderInvoice.css") });
        const pdfBuffer = await page.pdf(options);
        await browser.close();
        return pdfBuffer;
    }

    let ticketHtmlDoc = `<div
    style="
        margin: 30px;
    "
>
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 10px 0">
    <div style="border: 1px solid #c7c7c7; padding: 5px 10px;">
        <div style="margin-bottom: 5px;">
            <img
                src="${process.env.SERVER_URL + invoiceSettings?.companyLogo}"
                alt=""
                width="150"
            />
        </div>
        <span style="font-size: 13px; line-height: 20px;">${
            invoiceSettings?.address || ""
        }</span><br />
        <span style="font-size: 13px; line-height: 20px">Tel : ${
            invoiceSettings?.phoneNumber || ""
        }</span><br />
        <span style="font-size: 13px; line-height: 20px">E-mail : ${
            invoiceSettings?.emails?.length > 0
                ? invoiceSettings?.emails
                      ?.map((item, index) => {
                          return `${index !== 0 ? ", " : ""}${item}`;
                      })
                      ?.join("")
                : ""
        }</span>
    </div>
    <div style="border: 1px solid #c7c7c7; padding: 5px 10px; line-height: 20px">
        <h2 style="margin: 0; padding: 0; font-size: 17px; margin-bottom: 5px;">${
            flightOrder?.reseller?.companyName
        }</h2>
        <span style="font-size: 13px; line-height: 20px;">${flightOrder?.reseller?.address}</span>
        <span style="display: block; text-transform: capitalize; font-size: 13px; line-height: 20px;">${
            flightOrder?.reseller?.country?.countryName
        }</span>
        <span style="display: block; font-size: 13px; line-height: 20px;">E-mail : ${
            flightOrder?.reseller?.email
        }</span>
    </div>
    </div>

    <div>
        <div
            style="
                display: flex;
                align-items: center;
                gap: 10px;
                background-color: #d3d3d3;
                padding: 3px 8px;
            "
        >
            <span style="font-weight: 600">Booking Details</span>
        </div>
        <div style="display: flex; align-items: start; gap: 20px; padding: 15px 0px">
            <table style="font-size: 14px">
                <tbody>
                    <tr>
                        <td style="padding: 4px; padding-left: 0px;">
                            Booking Reference
                        </td>
                        <td style="padding: 4px">:</td>
                        <td style="padding: 4px">${flightOrder?.referenceNumber}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px; padding-left: 0px;0">Name</td>
                        <td style="padding: 4px">:</td>
                        <td style="padding: 4px">${
                            flightOrder?.passengers[0]?.firstName +
                            " " +
                            flightOrder?.passengers[0]?.lastName
                        }</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px; padding-left: 0px;0">
                            Agency Code
                        </td>
                        <td style="padding: 4px">:</td>
                        <td style="padding: 4px">${flightOrder?.reseller?.agentCode}</td>
                    </tr>
                </tbody>
            </table>
            <table style="font-size: 14px">
                <tbody>
                    <tr>
                        <td style="padding: 4px; padding-left: 0px;">
                            Booking Confirmation Date
                        </td>
                        <td style="padding: 4px">:</td>
                        <td style="padding: 4px">${formatDate(flightOrder?.createdAt)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px; padding-left: 0px;">
                            Payment Type
                        </td>
                        <td style="padding: 4px">:</td>
                        <td style="padding: 4px">Wallet</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <div>
        <div
            style="
                display: flex;
                align-items: center;
                gap: 10px;
                background-color: #d3d3d3;
                padding: 3px 8px;
            "
        >
            <span style="font-weight: 600">Services</span>
        </div>

        <div style="padding: 10px 0px">
            <h2 style="padding: 0; margin: 0; font-size: 15px">Airline</h2>
            <div>
                <table style="font-size: 14px; border-collapse: collapse; width: 100%">
                    <thead style="text-align: left">
                        <tr>
                            <th
                                style="
                                    font-weight: 600;
                                    font-size: 12px;
                                    border-bottom: 1px solid #c7c7c7;
                                    padding: 5px 0px;
                                "
                            >
                                Airport
                            </th>
                            <th
                                style="
                                    font-weight: 600;
                                    font-size: 12px;
                                    border-bottom: 1px solid #c7c7c7;
                                    padding: 5px 0px;
                                "
                            >
                                Departure
                            </th>
                            <th
                                style="
                                    font-weight: 600;
                                    font-size: 12px;
                                    border-bottom: 1px solid #c7c7c7;
                                    padding: 5px 0px;
                                "
                            >
                                Class
                            </th>
                            <th
                                style="
                                    font-weight: 600;
                                    font-size: 12px;
                                    border-bottom: 1px solid #c7c7c7;
                                    padding: 5px 0px;
                                "
                            >
                                Occupancy
                            </th>
                            <th
                                style="
                                    font-weight: 600;
                                    font-size: 12px;
                                    border-bottom: 1px solid #c7c7c7;
                                    padding: 5px 0px;
                                "
                            ></th>
                        </tr>
                    </thead>
                    <tbody style="font-size: 13px">
                        <tr>
                            <td
                                style="
                                    border-bottom: 1px solid #c7c7c7;
                                    padding: 5px 0px;
                                    text-transform: capitalize;
                                "
                            >
                                ${flightOrder?.trips[0]?.flightSegments[0]?.from} to ${
        flightOrder?.trips[0]?.flightSegments[flightOrder?.trips[0]?.flightSegments?.length - 1]?.to
    } (${flightOrder?.tripType === "oneway" ? "Oneway Trip" : "Round Trip"})
                            </td>
                            <td
                                style="
                                    border-bottom: 1px solid #c7c7c7;
                                    padding: 5px 0px;
                                    text-transform: capitalize;
                                "
                            >
                                ${formatDate(
                                    flightOrder?.trips[0]?.flightSegments[0]?.departureDate
                                )}
                            </td>
                            <td
                                style="
                                    border-bottom: 1px solid #c7c7c7;
                                    padding: 5px 0px;
                                    text-transform: capitalize;
                                "
                            >
                                ${flightOrder?.trips[0]?.flightSegments[0]?.travelClass}
                            </td>
                            <td style="border-bottom: 1px solid #c7c7c7; padding: 5px 0px">
                                ${flightOrder?.noOfAdults} Adults, ${
        flightOrder?.noOfChildren
    } Children, ${flightOrder?.noOfInfants} Infant
                            </td>
                            <td style="border-bottom: 1px solid #c7c7c7; padding: 5px 0px">
                                ${flightOrder?.netFare} AED
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div style="display: flex; justify-content: flex-end; margin-top: 10px">
                <table style="font-size: 14px">
                    <tbody>
                        <tr>
                            <td style="padding: 4px">Sub Total</td>
                            <td style="text-align: right; padding: 4px; padding-right: 4px">
                                ${flightOrder?.netFare} AED
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 4px">Tax</td>
                            <td style="text-align: right; padding: 4px; padding-right: 4px">
                                0 AED
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 4px">Total</td>
                            <td
                                style="
                                    text-align: right;
                                    padding: 4px;
                                    padding-right: 4px;
                                    font-weight: 600;
                                    font-size: 16px;
                                "
                            >
                                ${flightOrder?.netFare} AED
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        ${
            invoiceSettings.showTermsAndConditions === true
                ? ` <div style="border-top: 1px solid #c7c7c7; padding: 15px 0">
        <h2 style="margin: 0; padding: 0; font-size: 15px; margin-bottom: 2px">
            Terms And Condition
        </h2>
        <span>${invoiceSettings.termsAndConditions}</span>
    </div>`
                : ""
        }

        ${
            invoiceSettings.showBankDetails === true
                ? `<div>
        <span><b>Bank Details</b></span><br />
        <span>
            Bank Name: ${invoiceSettings?.bankAccounts[0]?.bankName || ""}<br />
            Account No. ${invoiceSettings?.bankAccounts[0]?.accountNumber || ""}<br />
            Branch : ${invoiceSettings?.bankAccounts[0]?.branchAddress || ""}<br />
            IBAN NO. ${invoiceSettings?.bankAccounts[0]?.ibanCode || ""}<br />
            SWIFT CODE : ${invoiceSettings?.bankAccounts[0]?.swiftCode || ""}</span
        >
    </div>`
                : ""
        }
    </div>
</div>
`;
    combinedHtmlDoc += ticketHtmlDoc;

    try {
        const pdfBuffer = await generatePdfAsBuffer(combinedHtmlDoc, options);

        return pdfBuffer;
    } catch (err) {
        throw err;
    }
};

module.exports = createB2bFlightOrderInvoice;
