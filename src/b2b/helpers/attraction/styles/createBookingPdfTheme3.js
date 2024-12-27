// const html_to_pdf = require("html-pdf-node");
const bwipjs = require("bwip-js");
const qrcode = require("qrcode");
const puppeteer = require("puppeteer");

const createBookingPdfTheme3 = async (activity, name) => {
    let combinedHtmlDoc = "";
    let options = {
        format: "A4",
        type: "buffer",
        margin: {
            top: "30px",
            bottom: "30px",
        },
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
                    scale: 1, // Image scale factor
                    height: 5, // Barcode height in millimeters
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

    const generateQRCodeImage = async (content) => {
        try {
            const qrCodeDataUrl = await qrcode.toDataURL(content);
            return qrCodeDataUrl;
        } catch (error) {
            console.error(error);
            return null;
        }
    };

    let barcodeImage = activity?.bookingConfirmationNumber
        ? await generateBarcodeImage(activity?.bookingConfirmationNumber)
        : "";
    let qrCodeImage = activity?.bookingConfirmationNumber
        ? await generateQRCodeImage(activity?.bookingConfirmationNumber)
        : "";
    let styles = `
        <style>

       body {
        margin: 0;
        padding: 0;  
       }
      
        </style>`;
    let ticketHtmlDoc = `
    ${styles}
    <div style="min-width: 100vw; min-height: 100vh; background-color: white; margin: 0;
    padding: 0; ">
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
        Tour Name: ${activity?.activity?.name}
    </div>
    ${
        activity?.bookingConfirmationNumber
            ? `<div
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
            src=${activity?.bookingConfirmationNumber ? qrCodeImage : ""} 
                alt="Barcode Image N/A"
            />
        </div>
        <div>
            <p style="font-size: 14px; font-weight: 500">${
                activity?.bookingConfirmationNumber
                    ? activity.attraction._id == "63ff12f5d7333637a938cad4"
                        ? activity.voucherNumber
                        : activity.bookingConfirmationNumber
                    : "N/A"
            }</p>
        </div>
    </div>`
            : ""
    }
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
    >    
    <div>
            <div style="font-size: 14px; font-weight: bold">Guest</div>
            <div style="font-size: 14px">${name}</div>
            <div style="font-size: 14px; font-weight: bold">
                --------------
            </div>
        </div>
        <div>
            <div style="font-size: 14px; font-weight: bold">Ticket Type</div>
            <div style="font-size: 14px">${activity.bookingType}</div>
            <div style="font-size: 14px; font-weight: bold">
                --------------
            </div>
        </div>
        <div>
        <div style="font-size: 14px; font-weight: bold">Booking Number</div>
        <div style="font-size: 14px"> ${
            activity.bookingConfirmationNumber
                ? activity.attraction._id === "63ff12f5d7333637a938cad4"
                    ? activity.voucherNumber
                    : activity.bookingConfirmationNumber
                : "N/A"
        }</div>
        <div style="font-size: 14px; font-weight: bold">
            --------------
        </div>
    </div>
        <div>
            <div style="font-size: 14px; font-weight: bold">Travel Date</div>
            <div style="font-size: 14px">${
                activity.attraction._id === "63ff12f5d7333637a938cad4"
                    ? new Date(activity.startTime).toLocaleString("default", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "numeric",
                      })
                    : new Date(activity.date).toLocaleString("default", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                      })
            }</div>
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
        <div>
            <div style="font-size: 14px; font-weight: bold">Adult count</div>
            <div style="font-size: 14px">${activity.adultsCount}</div>
            <div style="font-size: 14px; font-weight: bold">
                --------------
            </div>
        </div>
        <div>
            <div style="font-size: 14px; font-weight: bold">Child Count</div>
            <div style="font-size: 14px">${activity.childrenCount}</div>
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
        <div >
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
    </div>
              
        `;
    combinedHtmlDoc += ticketHtmlDoc;

    try {
        const pdfBuffer = await generatePdfAsBuffer(combinedHtmlDoc, options);

        // let pdfBuffer = await html_to_pdf.generatePdf(file, options);
        return pdfBuffer;
    } catch (err) {
        throw err;
    }
};

module.exports = createBookingPdfTheme3;
