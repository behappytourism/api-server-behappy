// const html_to_pdf = require("html-pdf-node");
const bwipjs = require("bwip-js");
const qrcode = require("qrcode");
const QRious = require("qrious");
const puppeteer = require("puppeteer");

const createSingleTicketTheme3Pdf = async (activity, ticket, name) => {
    let combinedHtmlDoc = "";
    let options = {
        format: "A4",
        type: "buffer",
        margin: {
            top: "30px",
            bottom: "30px",
        },
    };

    try {
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
            const pdfBuffer = await page.pdf(options);
            await browser.close();
            return pdfBuffer;
        }

        const generateBarcodeImage = (content) => {
            return new Promise((resolve, reject) => {
                bwipjs.toBuffer(
                    {
                        bcid: "code128", // Barcode type
                        text: content, // Barcode content
                        scale: 2, // Image scale factor
                        height: 10, // Barcode height in millimeters
                    },
                    function (err, pngBuffer) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(pngBuffer.toString("base64"));
                        }
                    }
                );
            });
        };
        // const generateQRCodeImage = (content) => {
        //     const qr = new QRious({
        //         value: content,
        //         size: 250, // adjust the size as per your requirement
        //     });
        //     return qr.toDataURL();
        // };
        // const generateQRCodeImage = (content) => {
        //     return new Promise((resolve, reject) => {
        //         qrcode.toDataURL(content, (err, pngBuffer) => {
        //             if (err) {
        //                 reject(err);
        //             } else {
        //                 resolve(pngBuffer.toString("base64"));
        //             }
        //         });
        //     });
        // };

        // console.log(activity, ticket, "activity");

        const generateQRCodeImage = async (content) => {
            try {
                const qrCodeDataUrl = await qrcode.toDataURL(content);
                return qrCodeDataUrl;
            } catch (error) {
                console.error(error);
                return null;
            }
        };

        let barcodeImage = await generateBarcodeImage(ticket.ticketNo);
        let qrCodeImage = await generateQRCodeImage(ticket.ticketNo);

        let styles = `
        <style>

       body {
        margin: 0;
        padding: 0;  
       }
      
        </style>`;
        let ticketHtmlDoc = `
    ${styles}
        <body>
            <div
                class="sec-1"
                style="width: 100%; height: 120px; display: flex"
            >
                <div
                    style="
                        width: 200px;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        background-color: rgb(230, 229, 229);
                        position: relative;
                    "
                >
                <img style="width: 200px; height: 100px; padding-left: 30px" src="${
                    process.env.SERVER_URL
                }${activity?.attraction?.logo}" alt="">
                    <div
                        style="
                            position: absolute;
                            width: 10px;
                            height: 15px;
                            bottom: 0;
                            right: 0;
                            background-color: white;
                            border-radius: 100% 0 0 0;
                        "
                    ></div>
                </div>
                <div
                    style="
                        width: 10px;
                        display: flex;
                        justify-content: center;
                        background: repeating-linear-gradient(
                            0deg,
                            white,
                            white 15px,
                            rgb(230, 229, 229) 15px,
                            rgb(230, 229, 229) 30px
                        );
                    "
                >
                    <p></p>
                </div>
                <div
                    style="
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: end;
                        background-color: rgb(230, 229, 229);
                        padding-right: 20px;
                        gap: 10px;
                        position: relative;
                    "
                >
                    <div
                        style="
                            position: absolute;
                            width: 10px;
                            height: 15px;
                            bottom: 0;
                            left: 0;
                            background-color: white;
                            border-radius: 0 100% 0 0;
                        "
                    ></div>
                    <div style="font-size: 14px; font-weight: bold">
                        This is your E-Ticket
                    </div>

                    <div>
                        This Ticket is Non - Refundable or Non - Transferable
                    </div>
                </div>
            </div>
        <div
            class="sec-2"
            style="
                width: 100%;
                height: 140px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-top: 5px;
            "
        >
            <div
                style="font-size: 14px; font-weight: bold; padding-left: 30px"
            >
                Tour Name:  ${activity?.activity?.name}
            </div>
            <div
                style="
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    padding-right: 30px;
                "
            >
                <div style="background-image: url('IMAGES/barcode.png')">
                    <img
                    style="width: 135px; height: 135px"
                    src="${qrCodeImage}"  
                                                alt="Barcode Image"
                    />
                </div>
                <div>
                    <p style="font-size: 14px; font-weight: 500">                                     ${
                        ticket?.ticketNo
                    }
                    </p>
                </div>
            </div>
        </div>
        <div
            class="sec-3"
            style="
                width: 100%;
                height: max-content;
                display: flex;
                justify-content: space-between;
                padding-top: 5px;
            "
        >
            <div
                style="
                    display: block;
                    justify-content: start;
                    padding-left: 30px;
                    gap: 8px;
                "
                ;
            > <div>
                 
            <div>
            <div style="font-size: 14px; font-weight: bold">Guest</div>
            <div style="font-size: 14px">${name}</div>
            <div style="font-size: 14px; font-weight: bold">
                --------------
            </div>
        </div>
                <div>
                    <div style="font-size: 14px; font-weight: bold">Ticket Type </div>
                    <div style="font-size: 14px">${ticket?.ticketFor}</div>
                    <div style="font-size: 14px; font-weight: bold">
                        --------------
                    </div>
                </div>
                <div>
                <div style="font-size: 14px; font-weight: bold">Ticket No</div>
                <div style="font-size: 14px">${ticket?.ticketNo}</div>
                <div style="font-size: 14px; font-weight: bold">
                    --------------
                </div>
            </div>
                <div>
                    <div style="font-size: 14px; font-weight: bold">Destination</div>
                    <div style="font-size: 14px">${activity?.destination?.name}</div>
                    <div style="font-size: 14px; font-weight: bold">
                        --------------
                    </div>
                </div>
                <div>
                    <div style="font-size: 14px; font-weight: bold">Valid Till</div>
                    <div style="font-size: 14px">${
                        ticket && ticket.validity
                            ? new Date(ticket.validTill).toLocaleString("default", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                              })
                            : "N/A"
                    }</div>
                    <div style="font-size: 14px; font-weight: bold">
                        --------------
                    </div>
                </div>
                <div>
                    <div style="font-size: 14px; font-weight: bold">Lot Number</div>
                    <div style="font-size: 14px">${ticket?.lotNo}</div>
                    <div style="font-size: 14px; font-weight: bold">
                        --------------
                    </div>
                </div>
               
                <div>
                <div style="font-size: 14px; font-weight: bold">Transfer Type</div>
                <div style="font-size: 14px">${
                    activity?.transferType === "without" ? "Ticket Only" : activity?.transferType
                }</div>
                <div style="font-size: 14px; font-weight: bold">
                    --------------
                </div>
            </div>
            </div>
            <div
                style="
                    display: block;
                    justify-content: flex-end;
                    padding-right: 30px;
                "
                ;
            >
                <div style="background-image: url('IMAGES/barcode.png')">
                    <img
                        style="
                        width: 400px;
                        height: 300px;
                            display: block;
                            justify-content: flex-end;
                        "
                        src="${process.env.SERVER_URL}${activity?.attraction?.images[0]}"
                        alt="Barcode Image"
                    />
                </div>
            </div>
        </div>
        <div class="sec-4" style="padding-top: 10px">
            <div
                style="
                    font-size: 14px;
                    font-weight: 700;
                    text-decoration: underline;
                    padding-left: 30px;
                "
            >
                Terms & Conditions / Important Information:
            </div>
            <div style="font-size: 12px; padding-top: 10px; padding-left: 30px">
            ${activity?.activity?.termsAndConditions || ""}

            </div>
        </div>
    </body>  
                `;
        combinedHtmlDoc += ticketHtmlDoc;

        // let file = {
        //     content: combinedHtmlDoc,
        // };
        const pdfBuffer = await generatePdfAsBuffer(combinedHtmlDoc, options);

        // let pdfBuffer = await html_to_pdf.generatePdf(file, options);
        return pdfBuffer;
    } catch (err) {
        throw err;
    }
};

module.exports = createSingleTicketTheme3Pdf;
