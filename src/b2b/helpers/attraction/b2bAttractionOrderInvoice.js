const puppeteer = require("puppeteer");
const path = require("path");

const { InvoiceSettings } = require("../../../models/global");
const { B2BAttractionOrder } = require("../../models");
const { formatDate } = require("../../../utils");

const b2bAttractionOrderInvoice = async ({ orderId, resellerId }) => {
    try {
        const invoiceSettings = await InvoiceSettings.findOne({ settingsNumber: 1 })
            .populate("bankAccounts")
            .lean();
        if (!invoiceSettings) {
            throw new Error("invoice settings not found, please update");
        }

        const attractionOrder = await B2BAttractionOrder.findOne({
            _id: orderId,
            reseller: resellerId,
        })
            .populate({
                path: "reseller",
                populate: { path: "country" },
                select: "companyName address email country agentCode",
            })
            .populate("activities.activity activities.attraction");
        if (!attractionOrder) {
            throw new Error("attraction order not found");
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
            await page.addStyleTag({ path: path.join(__dirname, "styles/attractionInvoice.css") });
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
                    attractionOrder?.reseller?.companyName
                }</h2>
                <span style="font-size: 13px; line-height: 20px;">${
                    attractionOrder?.reseller?.address
                }</span>
                <span style="display: block; text-transform: capitalize; font-size: 13px; line-height: 20px;">${
                    attractionOrder?.reseller?.country?.countryName
                }</span>
                <span style="display: block; font-size: 13px; line-height: 20px;">E-mail : ${
                    invoiceSettings?.emails?.length > 0
                        ? invoiceSettings?.emails
                              ?.map((item, index) => {
                                  return `${index !== 0 ? ", " : ""}${item}`;
                              })
                              ?.join("")
                        : ""
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
                            <td style="padding: 4px">${attractionOrder?.referenceNumber}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px; padding-left: 0px;">Name</td>
                            <td style="padding: 4px">:</td>
                            <td style="padding: 4px">${attractionOrder?.name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px; padding-left: 0px;">
                                Agency Code
                            </td>
                            <td style="padding: 4px">:</td>
                            <td style="padding: 4px">${attractionOrder?.reseller?.agentCode}</td>
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
                            <td style="padding: 4px">${formatDate(attractionOrder?.createdAt)}</td>
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
                <h2 style="padding: 0; margin: 0; font-size: 15px">Accommodation</h2>
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
                                    Activity
                                </th>
                                <th
                                    style="
                                        font-weight: 600;
                                        font-size: 12px;
                                        border-bottom: 1px solid #c7c7c7;
                                        padding: 5px 0px;
                                    "
                                >
                                    Date
                                </th>
                                <th
                                    style="
                                        font-weight: 600;
                                        font-size: 12px;
                                        border-bottom: 1px solid #c7c7c7;
                                        padding: 5px 0px;
                                    "
                                >
                                    Pax
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
                            ${attractionOrder?.activities
                                ?.map((orderItem) => {
                                    return `<tr>
                                <td style="border-bottom: 1px solid #c7c7c7; padding: 5px 0px; text-transform: capitalize;">
                                    ${orderItem?.activity?.name}
                                </td>
                                <td style="border-bottom: 1px solid #c7c7c7; padding: 5px 0px; text-transform: capitalize;">
                                    ${formatDate(orderItem?.date)} 
                                </td>
                                <td style="border-bottom: 1px solid #c7c7c7; padding: 5px 0px">
                                    ${orderItem?.adultsCount} ADT, ${
                                        orderItem?.childrenCount
                                    } CHD, ${orderItem?.infantCount} INF
                                </td>
                                <td style="border-bottom: 1px solid #c7c7c7; padding: 5px 0px">
                                    ${orderItem?.grandTotal} AED
                                </td>
                            </tr>`;
                                })
                                .join("")}
                        </tbody>
                    </table>
                </div>
    
                <div style="display: flex; justify-content: flex-end; margin-top: 10px">
                    <table style="font-size: 14px">
                        <tbody>
                            <tr>
                                <td style="padding: 4px">Sub Total</td>
                                <td style="text-align: right; padding: 4px; padding-right: 4px">
                                ${attractionOrder?.totalAmount} AED
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
                                ${attractionOrder?.totalAmount} AED
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

        const pdfBuffer = await generatePdfAsBuffer(combinedHtmlDoc, options);

        return pdfBuffer;
    } catch (err) {
        throw err;
    }
};

module.exports = b2bAttractionOrderInvoice;
