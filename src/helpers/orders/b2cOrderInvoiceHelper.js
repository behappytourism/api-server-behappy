const puppeteer = require("puppeteer");
const path = require("path");
const { InvoiceSettings } = require("../../models/global");
const { B2COrder, B2CTransferOrder, AttractionOrder } = require("../../models");
const { formatDate } = require("../../utils");

const b2cOrderInvoice = async ({ orderId, user }) => {
    try {
        const invoiceSettings = await InvoiceSettings.findOne({ settingsNumber: 1 })
            .populate("bankAccounts")
            .lean();

        if (!invoiceSettings) throw new Error("invoice settings not found, please update");

        const b2cOrder = await B2COrder.findOne({
            _id: orderId,
        }).populate({
            path: "user",
            populate: { path: "country" },
            select: "companyName address email country agentCode",
        });

        if (!b2cOrder) throw new Error("order not found!");

        if (b2cOrder?.isAttraction) {
            const attrOrder = await AttractionOrder.findById(b2cOrder?.attractionId)
                .populate({
                    path: "activities.activity",
                    populate: {
                        path: "attraction",
                        populate: {
                            path: "destination",
                        },
                    },
                })
                .exec();

            b2cOrder.attractionOrder = attrOrder;
        }

        if (b2cOrder?.isTransfer) {
            const transferOrder = await B2CTransferOrder.findById(b2cOrder.transferId)
                .populate("journey.trips.vehicleTypes.vehicleId")
                .select({
                    baseFare: 0,
                    profit: 0,
                })
                .exec();

            b2cOrder.transferOrder = transferOrder;
        }

        let combinedHtmlDoc = "";
        let options = {
            format: "A4",
            type: "buffer",
        };

        async function generatePdfAsBuffer(htmlContent, options) {
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
            await page.addStyleTag({ path: path.join(__dirname, "style/orderInvoice.css") });
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
                    b2cOrder?.user?.name
                }</h2>
                <span style="font-size: 13px; line-height: 20px;">${b2cOrder?.user?.email}</span>
           
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
                            <td style="padding: 4px">${b2cOrder?.referenceNumber}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px; padding-left: 0px;">Name</td>
                            <td style="padding: 4px">:</td>
                            <td style="padding: 4px">${b2cOrder?.name}</td>
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
                            <td style="padding: 4px">${formatDate(b2cOrder?.createdAt)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px; padding-left: 0px;">
                                Payment Type
                            </td>
                            <td style="padding: 4px">:</td>
                            <td style="padding: 4px">CCAvenue</td>
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

                

                ${
                    b2cOrder?.attractionOrder?.activities
                        ? `
                        <h2 style="padding: 0; margin: 0; font-size: 15px">Attraction</h2>

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
                                    Amount
                                </th>
                                <th
                                style="
                                font-weight: 600;
                                font-size: 12px;
                                border-bottom: 1px solid #c7c7c7;
                                padding: 5px 0px;
                            "
                            >
                                VAT
                            </th>
                                <th
                                    style="
                                    font-weight: 600;
                                    font-size: 12px;
                                    border-bottom: 1px solid #c7c7c7;
                                    padding: 5px 0px;
                                "
                                > Total</th>
                            </tr>
                            </thead>
                            <tbody style="font-size: 13px">
                                
                                ${b2cOrder?.attractionOrder?.activities
                                    ?.map((orderItem) => {
                                        return `<tr>
                                <td style="border-bottom: 1px solid #c7c7c7; padding: 5px 0px; text-transform: capitalize;">
                                    ${orderItem?.activity?.name}
                                </td>
                                <td style="border-bottom: 1px solid #c7c7c7; padding: 5px 0px; text-transform: capitalize;">
                                    ${formatDate(orderItem?.date)} 
                                </td>
                                <td style="border-bottom: 1px solid #c7c7c7; padding: 5px 0px">
                                ${(orderItem?.grandTotal * 0.95).toFixed(2)} AED
                                </td>
                                <td style="border-bottom: 1px solid #c7c7c7; padding: 5px 0px">
                                ${(orderItem?.grandTotal * 0.05).toFixed(2)} AED
                                </td>
                                <td style="border-bottom: 1px solid #c7c7c7; padding: 5px 0px">
                                ${orderItem?.grandTotal.toFixed(2)} AED
                                </td>
                            </tr>`;
                                    })
                                    .join("")}
                            </tbody>
                        </table>
                        </div>
                        `
                        : ""
                }
              
                ${
                    b2cOrder?.transferOrder?.journey
                        ? `
                        <h2 style="padding: 0; margin: 0; font-size: 15px">Transfer</h2>
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
                                        Location
                                    </th>
                                    <th
                                        style="
                                        font-weight: 600;
                                        font-size: 12px;
                                        border-bottom: 1px solid #c7c7c7;
                                        padding: 5px 0px;
                                    "
                                    >
                                        Transfer Type
                                    </th>
                                    <th
                                        style="
                                        font-weight: 600;
                                        font-size: 12px;
                                        border-bottom: 1px solid #c7c7c7;
                                        padding: 5px 0px;
                                    "
                                    >
                                        Amount
                                    </th>
                                    <th
                                        style="
                                    font-weight: 600;
                                    font-size: 12px;
                                    border-bottom: 1px solid #c7c7c7;
                                    padding: 5px 0px;
                                "
                                    >
                                        VAT
                                    </th>
                                    <th
                                        style="
                                        font-weight: 600;
                                        font-size: 12px;
                                        border-bottom: 1px solid #c7c7c7;
                                        padding: 5px 0px;
                                    "
                                    >Total</th>
                                </tr>
                            </thead>
                            <tbody style="font-size: 13px">
                                
                                ${
                                    b2cOrder?.transferOrder?.journey?.length > 0
                                        ? b2cOrder?.transferOrder?.journey
                                              ?.map((item, index) => {
                                                  return ` <tr>
                                          <td style="border-bottom: 1px solid #c7c7c7; padding: 5px 0px; text-transform: capitalize;">
                                              ${
                                                  item?.trips[0]?.suggestionType.split("-")[0] ===
                                                  "AIRPORT"
                                                      ? item?.trips[0]?.transferFrom?.airportName
                                                      : item?.trips[0]?.transferFrom?.name
                                              } - ${
                                                      item?.trips[0]?.suggestionType.split(
                                                          "-"
                                                      )[1] === "AIRPORT"
                                                          ? item?.trips[0]?.transferTo?.airportName
                                                          : item?.trips[0]?.transferTo?.name
                                                  }                                       
                                          </td>
                                           <td style="border-bottom: 1px solid #c7c7c7; padding: 5px 0px; text-transform: capitalize;">
                                          ${item?.transferType}                    
                                                    </td>
                                                    <td style="border-bottom: 1px solid #c7c7c7; padding: 5px 0px">
                                                    ${(item?.netPrice * 0.95).toFixed(2)} AED
                                                    </td>
                                                    <td style="border-bottom: 1px solid #c7c7c7; padding: 5px 0px">
                                                    ${(item?.netPrice * 0.05).toFixed(2)} AED
                                                    </td>
                                                    <td style="border-bottom: 1px solid #c7c7c7; padding: 5px 0px">
                                                    ${item?.netPrice.toFixed(2)} AED
                                                    </td>
                                      </tr>`;
                                              })
                                              ?.join("")
                                        : ""
                                }
                            </tbody>
                        </table>
                        </div>`
                        : ""
                }      
                             

    
                <div style="display: flex; justify-content: flex-end; margin-top: 10px">
                    <table style="font-size: 14px">
                        <tbody>
                        <tr>
                        <td style="padding: 4px">Sub Total</td>
                        <td style="text-align: right; padding: 4px; padding-right: 4px">
                        ${(b2cOrder?.netPrice * 0.95).toFixed(2)} AED
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 4px">VAT</td>
                        <td style="text-align: right; padding: 4px; padding-right: 4px">
                        ${(b2cOrder?.netPrice * 0.05).toFixed(2)} AED
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
                        ${b2cOrder?.netPrice.toFixed(2)} AED
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

module.exports = b2cOrderInvoice;
