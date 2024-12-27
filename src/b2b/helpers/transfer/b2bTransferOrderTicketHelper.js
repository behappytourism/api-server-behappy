// const html_to_pdf = require("html-pdf-node");
const bwipjs = require("bwip-js");
const qrcode = require("qrcode");
const puppeteer = require("puppeteer");

const createTransferTicketPdf = async (order) => {
    let combinedHtmlDoc = "";
    let options = {
        format: "A4",
        type: "buffer",
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

        const option = {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        };

        let journeyDetails = order?.transferId?.journey;

        for (i = 0; i < journeyDetails.length; i++) {
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
        <div
            style="min-width: 100vw; min-height: 100vh; background-color: white"
        >
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
                    <img
                        style="
                            height: 50px;
                            width: 100px;
                            text-align: center;
                            align-tems: center;
                            object-fit: fit;
                        "
                        src="${process.env.COMPANY_LOGO}"
                        alt=""
                    />
                </div>
                <div style="display: flex;
                justify-content: center;
                align-items: center;"> <h1>Transfer Voucher</h1>
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
                       
                        <div><h3>Passenger details</h3></div>
                        <div style="
                        display: flex;
                        flex-direction: column;
                        justify-content: start;
                        text-align: left;
                                            ">
                        <p style="">Name : ${order.name?.toUpperCase()}</p>
                       <p>Email : ${order.email?.toLowerCase()}</p>
                       <p>Ph No :  ${order.phoneNumber}</p>
                    
                       
                    </div>
                    <div><h3>Pax details</h3></div>
                    <div style="
                    display: flex;
                    flex-direction: column;
                    justify-content: start;
                    text-align: left;
                                        ">
                   <p>Adults : ${journeyDetails[i].noOfAdults}</p>
                   <p>Childrens : ${journeyDetails[i].noOfChildrens}</p>
                </div>
                    
                    
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

                        <div>
                             <h2 style="color: #6082b6">
                                ${order.referenceNumber}
                            </h2> 
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
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            gap: 10px;
                        "
                        class="bg-color"
                    >
                       
                        <h2>${
                            journeyDetails[i].transferType === "oneway"
                                ? "OneWay Transfer"
                                : "Return Transfer"
                        }</h2>                    </div>
                    ${journeyDetails[i].trips.map((trip) => {
                        console.log(trip?.suggestionType.split("-")[1], "sugg");
                        return `
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
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div><h3>Pickup Location</h3></div>
                    <div></div>
                    <div><h3>Drop-off Location</h3></div>
                </div>
 
                                <div
                                style="
                                    display: flex;
                                    justify-content: space-between;
                                    align-items: center;
                                "
                            >
                            <div>
                            <h3> ${
                                trip?.suggestionType?.split("-")[0] === "AIRPORT"
                                    ? trip?.transferFrom?.airportName
                                    : trip?.transferFrom?.name
                            }</h3>
                        </div>
                        <div><h5></h5></div>
                        <div>
                            <h3> ${
                                trip?.suggestionType.split("-")[1] === "AIRPORT"
                                    ? trip?.transferTo?.airportName
                                    : trip?.transferTo?.name
                            }</h3>
                        </div>
                        
                            </div>
                                    <div
                                        style="
                                            display: flex;
                                            justify-content: space-between;
                                            align-items: center;
                                        "
                                    >
                                        <div><p>${trip.pickupDate.toLocaleDateString(
                                            "en-US",
                                            option
                                        )}</p></div>
                                        <div><p>${trip.pickupDate.toLocaleDateString(
                                            "en-US",
                                            option
                                        )}</p></div>
                                    </div>
                    
                                    <div
                                        style="
                                            display: flex;
                                            justify-content: space-between;
                                            align-items: center;
                                        "
                                    >
                                        <div>
                                            <h3>${trip.pickupTime}</h3>
                                        </div>
                                        <div>
                                           
                                        </div>
                                        <div>
                                            <h3 ></h3>
                                        </div>
                                    </div>
                                    <h3>Vehicles Details</h3>
                                    <div style="display: flex; justify-content: center; align-items: center; padding: 10px;">
                                        ${trip.vehicleTypes
                                            .map((vehTy) => {
                                                return `
            <div style="margin-right: 20px; text-align: left;">
                <p>Name: ${vehTy.name}</p>
                <p>Count: ${vehTy.count}</p>
            </div>
        `;
                                            })
                                            .join("")}
</div>

                                
                    
                                 
                                </div>
                            </div>
                        `;
                    })}
                    
                </div>
               
                
            </div>
        </div>
    </body>
        `;
            combinedHtmlDoc += ticketHtmlDoc;
        }

        const pdfBuffer = await generatePdfAsBuffer(combinedHtmlDoc, options);

        // let pdfBuffer = await html_to_pdf.generatePdf(file, options);
        return pdfBuffer;
    } catch (err) {
        console.log(err);
        throw err;
    }
};

module.exports = createTransferTicketPdf;
