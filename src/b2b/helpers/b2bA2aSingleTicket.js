// const html_to_pdf = require("html-pdf-node");
const bwipjs = require("bwip-js");
const qrcode = require("qrcode");
const puppeteer = require("puppeteer");

const createA2aSingleTicketPdf = async (order) => {
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

    let barcodeImage = await generateBarcodeImage(order.passengerDetails.ticketNo);
    let qrCodeImage = await generateQRCodeImage(order.passengerDetails.ticketNo);

    function getDuration(startTime, endTime) {
        const start = new Date(`01/01/2022 ${startTime}`);
        const end = new Date(`01/01/2022 ${endTime}`);
        const diff = end.getTime() - start.getTime();
        const hours = Math.floor(diff / 1000 / 60 / 60);
        const minutes = Math.floor((diff / 1000 / 60 / 60 - hours) * 60);
        return `${hours}h ${minutes}min`;
    }

    const onwardDate = new Date(order.a2aTicket.onwardDate);
    const returnDate = new Date(order.a2aTicket.returnDate);

    const option = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    };

    const formattedDateOnwardDate = onwardDate.toLocaleDateString("en-US", option);
    const formattedDateReturnDate = returnDate.toLocaleDateString("en-US", option);

    let styles = `
    <head>
    <title>Font Awesome Icons</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
    />
    <script src="https://kit.fontawesome.com/697476b19f.js" crossorigin="anonymous"></script>   
       </head>
    <style>
    body {
      margin: 0;
    }
    .bg-color{
      background-color : red;
    }
    p {
      font-size: small;
      margin: 0;
    }
    h1 {
      font-size: large;
      margin: 0;
    }
    h2 {
      font-size: medium;
      margin: 0;
    }
    h3 {
      font-size: small;
      margin: 0;
    }
  </style>`;

    let ticketHtmlDoc = `${styles}
  
  <body>
    <div style="min-width: 100vw; min-height: 100vh; background-color: white">
      <div
        style="
          border: 1px;
          display: flex;
          flex-direction: column;
          padding: 40px;
          border-color: black;
          gap: 10px;
        "
      >
        <div
          style="
            height: 50px;
            width: auto;
            display: flex;
            justify-content: space-between;
            padding: 5px;
            text-align: center;
            align-items: center;
          "
        >
        <img style="height : 50px; width :100px;   text-align: center; align-tems : center ; object-fit: fit;" src="${
            process.env.SERVER_URL
        }${order.a2aTicket.airlineOnwardLogo}"  alt="">
          <img style="height : 50px; width :150px;" src="data:image/png;base64,${barcodeImage}" />
        </div>
        <div
          style="
            margin-top: 10px;

            height: 150px;
            width: auto;
            display: flex;
            justify-content: space-between;
            padding: 10px;
            text-align: center;
            align-items: center;
            border: 1px solid rgb(139, 137, 137);
          "
        >
          <div
            style="
              display: flex;
              flex-direction: column;
              justify-content: start;
              align-items: flex-start;
              padding-left: 10px;
              gap: 6px;
            "
          >
            <div
              style="
                display: flex;

                justify-content: start;
                align-items: flex-start;
              "
            >
              <div>
                <i
                  class="fa fa-check"
                  style="font-size: 20px; color: rgb(41, 238, 41)"
                ></i>
              </div>
              <div style="padding-left: 10px; color: rgb(31, 218, 31)">
                Your booking is confirmed
              </div>
            </div>
            <div><p>Thank you for booking with us.</p></div>
            <div><h3>Passenger details</h3></div>
            <div>
            <h2>
            ${
                order.passengerDetails?.title.charAt(0).toUpperCase() +
                order.passengerDetails?.title.slice(1).toLowerCase()
            } ${
        order.passengerDetails?.firstName.charAt(0).toUpperCase() +
        order.passengerDetails?.firstName.slice(1).toLowerCase()
    }
          ${
              order.passengerDetails?.lastName.charAt(0).toUpperCase() +
              order.passengerDetails?.lastName.slice(1).toLowerCase()
          }
             </h2>
             </div>

           
          
            <div><p>Primary Adult</p></div>
            <div>
              ${
                  order.passengerDetails?.isInfant
                      ? `<h2>
                  ${
                      order.passengerDetails?.infantDetails?.title.charAt(0).toUpperCase() +
                      order.passengerDetails.infantDetails.title.slice(1).toLowerCase()
                  }
                  ${
                      order.passengerDetails?.infantDetails?.firstName.charAt(0).toUpperCase() +
                      order.passengerDetails.infantDetails.firstName.slice(1).toLowerCase()
                  }
                  ${
                      order.passengerDetails?.infantDetails?.lastName.charAt(0).toUpperCase() +
                      order.passengerDetails?.infantDetails?.lastName.slice(1).toLowerCase()
                  }
                </h2>`
                      : ""
              }
            </div>
            

               
               <div> ${order.passengerDetails?.isInfant ? `<p>Primary Infant</p>` : ""}</div>
          </div>
          <div
            style="
              display: flex;

              justify-content: center;
              align-items: center;
            "
          >
          <img src="${
              process.env.SERVER_URL
          }/public/images/admins/visaChange2.jpeg" alt="Image description" style="width: 150px; height: 100px; object-fit: fit" />
          </div>

          <div
            style="
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              padding: 10px;
              gap: 10px;
            "
          >
            <div>Reference Number</div>
            
            <div ><h2 style="color: #6082B6">${order.passengerDetails.ticketNo}</h2></div>
          </div>
        </div>

        <div
          style="
            margin-top: 10px;
            border: 1px solid rgb(105, 105, 105);
            height: max-content;
            width: auto;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            text-align: center;
            align-items: center;
            width: 100%;
            border-radius: 10px;
            overflow: hidden;
          "
        >
          <div
            style="
              height: 40px;
              width: 100%;
              // background-color: blue;
              display: flex;
              justify-content: start;
              align-items: center;
              gap: 10px;
              border-bottom : 1px solid rgb(105, 105, 105);

            "
            class="bg-color"
          >
            <div style="padding: 10px">
              <i class="fa fa-plane" style="font-size: 36px"></i>
            </div>
            <div>
              Departure from ${order.a2aTicket.airportFromName}
              <span style="font-size: large" ;>(Flight ${order.a2aTicket.airlineOnwardNo})</span>
            </div>
          </div>
          <div
            style="
              height: max-content;
              width: 100%;

              display: flex;
              justify-content: center;
            "
          >
            <div
              style="
                height: max-content;
                width: 100%;

                padding-right: 10px;
                padding: 10px;
              "
            >
              <div
                style="
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <div><p>${formattedDateOnwardDate}</p></div>
                <div><p>${formattedDateOnwardDate}</p></div>
              </div>

              <div
                style="
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <div><h1>${order.a2aTicket.takeOffTimeOnward}</h1></div>
                <div>
                - - - - - - - - - ${order.a2aTicket.onwardDurationHr}H : ${
        order.a2aTicket.onwardDurationMin
    }M - - - - - - - - -
                </div>
                <div><h1>${order.a2aTicket.landingTimeOnward}</h1></div>
              </div>
              <div
                style="
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <div><h3>${order.a2aTicket.airportFromName}</h3></div>
                <div><h5>Non-stop</h5></div>
                <div><h3>${order.a2aTicket.airportToName}</h3></div>
              </div>
              <div
                style="
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <div><h2>${order.a2aTicket.airportFromIata}</h2></div>
                <div><h2>${order.a2aTicket.airportToIata}</h2></div>
              </div>
            </div>
       
          </div>
        </div>
        <div
          style="
            margin-top: 10px;
            border: 1px solid rgb(105, 105, 105);
            height: max-content;
            width: auto;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            text-align: center;
            align-items: center;
            width: 100%;
            border-radius: 10px;
            overflow: hidden;
          "
        >
          <div
            style="
              height: 40px;
              width: 100%;
              background-color:  #C8C8FA;
              display: flex;
              justify-content: start;
              align-items: center;
              gap: 10px;
              border-bottom : 1px solid rgb(105, 105, 105);

            "
          >
            <div style="padding: 10px">
              <i class="fa fa-plane" style="font-size: 36px"></i>
            </div>
            <div>
              Departure from ${order.a2aTicket.airportToName}
              <span style="font-size: large" ;>(Flight ${order.a2aTicket.airlineReturnNo})</span>
            </div>
          </div>
          <div
            style="
              height: max-content;
              width: 100%;

              display: flex;
              justify-content: center;
            "
          >
            <div
              style="
                height: max-content;
                width: 100%;

                padding-right: 10px;
                padding: 10px;
              "
            >
              <div
                style="
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <div><p>${formattedDateReturnDate}</p></div>
                <div><p>${formattedDateReturnDate}</p></div>
              </div>

              <div
                style="
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <div><h1>${order.a2aTicket.takeOffTimeReturn}</h1></div>
                <div>
                <h5>
                - - - - - - - - ${order.a2aTicket.returnDurationHr}H : ${
        order.a2aTicket.returnDurationMin
    }M - - - - - - - - -
              </h5>
                </div>
                <div><h1>${order.a2aTicket.landingTimeReturn}</h1></div>
              </div>
              <div
                style="
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <div><h3>${order.a2aTicket.airportToName}</h3></div>
                <div><h5>Non-stop</h5></div>
                <div><h3>${order.a2aTicket.airportFromName}</h3></div>
              </div>
              <div
                style="
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <div><h2>${order.a2aTicket.airportToIata}</h2></div>
                <div><h2>${order.a2aTicket.airportFromIata}</h2></div>
              </div>
            </div>
           
          </div>
        </div>
        <div
        style="
          margin-top: 10px;
          border: 1px solid rgb(105, 105, 105);
          height: max-content;
          width: 50%;
          display: flex;

          flex-direction: column;
          justify-content: start;
        "
      >
        <div
          style="
            padding: 10px;
            height: max-content;
            width: 100%;

            display: flex;
            flex-direction: column;
            justify-content: start;
          "
        >
          order reference ${order.referenceNumber}
        </div>
        <div
        style="
            border-top: 1px solid rgb(105, 105, 105);
            height: max-content;
            width: 100%;
            display: flex;
            flex-direction: column;
            justify-content: start;
            gap: 10px;
          "
          
        >
        <div
        style="
        padding : 10px;
            height: max-content;
            width: 100%;
            display: flex;
            flex-direction: column;
            justify-content: start;
            gap: 10px;
          ">
        <div>Invoice </div>
        <div>${order.createdAt.toLocaleString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "numeric",
        })}</div>          
          <div>Paid via travel agent IATA No. ${process.env.IATA_NO}</div>
        </div>
         
        </div>
      </div>
    </div>
  </div>
</body>
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

module.exports = createA2aSingleTicketPdf;
