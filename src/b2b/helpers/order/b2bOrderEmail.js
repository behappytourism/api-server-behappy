const { sendEmail } = require("../../../helpers");
const {
    b2cAttractionPdfBufferHelper,
} = require("../../../helpers/attraction/attractionTicketHelper");
const commonFooter = require("../../../helpers/commonFooter");
const b2cOrderInvoice = require("../../../helpers/orders/b2cOrderInvoiceHelper");
const {
    attractionPdfBufferHelper,
    b2bAttractionPdfBufferHelper,
} = require("../attraction/b2bAttractionTicketHelper");
const b2bOrderInvoice = require("./b2bOrderInvoice");

const sendOrderEmail = async ({
    product,
    action,
    subject,
    email,
    name,
    order,
    attractionOrder,
    transferOrder,
    orderedBy,
}) => {
    try {
        const footerHtml = await commonFooter();
        let attachments = [];
        if (orderedBy === "b2b") {
            const b2cOrderInvoiceBuffer = await b2bOrderInvoice({
                orderId: order._id,
            });

            attachments.push({
                filename: `invoice-${order?.referenceNumber}.pdf`,
                content: b2cOrderInvoiceBuffer,
                contentType: "application/pdf",
            });

            for (let i = 0; i < attractionOrder?.activities.length; i++) {
                let activity = attractionOrder?.activities[i];
                const { pdfBuffer } = await b2bAttractionPdfBufferHelper({
                    orderId: attractionOrder._id,
                    activityId: activity._id,
                });
                attachments.push({
                    filename: `${activity.activity.attraction.title}-${order?.referenceNumber}.pdf`,
                    content: pdfBuffer,
                    contentType: "application/pdf",
                });
            }
        } else {
            const b2cOrderInvoiceBuffer = await b2cOrderInvoice({
                orderId: order._id,
            });

            attachments.push({
                filename: `invoice-${order?.referenceNumber}.pdf`,
                content: b2cOrderInvoiceBuffer,
                contentType: "application/pdf",
            });

            for (let i = 0; i < attractionOrder?.activities.length; i++) {
                let activity = attractionOrder?.activities[i];
                const { pdfBuffer } = await b2cAttractionPdfBufferHelper({
                    orderId: attractionOrder._id,
                    activityId: activity._id,
                });
                attachments.push({
                    filename: `${activity.activity.attraction.title}-${order?.referenceNumber}.pdf`,
                    content: pdfBuffer,
                    contentType: "application/pdf",
                });
            }
        }

        sendEmail(
            `${email}`,
            `${subject} - ${order?.referenceNumber}`,
            `<body style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5;">
            <div style="background-color: #333; color: #fff; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">Order Placed</h1>
            </div>
            <div style="background-color: #f7f7f7; padding: 20px;">
              <p style="font-size: 18px; font-weight: bold;">Dear ${name},</p>
              <p style="margin-top: 20px;">Thank you for your order. Your order details are as follows:</p>
              <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
                <tr style="background-color: #eee;">
                  <td style="padding: 10px; border: 1px solid #ddd;">Reference Number:</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${order.referenceNumber}</td>
                </tr>
                <tr style="background-color: #eee;">
                  <td style="padding: 10px; border: 1px solid #ddd;">Total Amount:</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${order.netPrice} AED</td>
                </tr>
                
                </table>

                ${
                    attractionOrder?.activities
                        .map((activity, index) => {
                            const link =
                                activity?.bookingType === "ticket"
                                    ? `<a href="${process.env.SERVER_URL}/attractions/orders/${attractionOrder?._id}/ticekt/${activity?._id}" download>View Ticket</a>`
                                    : "";
                            // const attachments: [
                            //     {
                            //       filename: 'attachment.txt', // The name you want for the attachment
                            //       content: Buffer.from('This is the content of the attachment', 'utf-8'), // Your buffer content
                            //     },
                            //   ]

                            const totalPersons =
                                activity.adultsCount ||
                                0 + activity.infantCount ||
                                0 + activity.childrenCount;

                            return `
                  <div>
                  <p style="padding: 10px; font-size: 14px; font-weight: bold; ">Attraction ${
                      index + 1
                  }</p>
                  <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">

                  
                    <tr style="background-color: ${index % 2 === 0 ? "#eee" : ""};">
                    <td style="padding: 10px; border: 1px solid #ddd;">Attraction:</td>
                      <td style="padding: 10px; border: 1px solid #ddd;">${
                          activity.activity.attraction.title
                      }</td>
               
                    </tr>
                    <tr style="background-color: ${index % 2 === 0 ? "" : "#eee"};">
                    <td style="padding: 10px; border: 1px solid #ddd;">Order Type:</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${activity.bookingType}</td>
                    </tr>
                    <tr style="background-color: ${index % 2 === 0 ? "#eee" : ""};">
                      <td style="padding: 10px; border: 1px solid #ddd;">Total Pax:</td>
                      <td style="padding: 10px; border: 1px solid #ddd;">
                      ${activity.adultsCount > 0 ? activity.adultsCount + " adults" : ""}
                      ${activity.childrenCount > 0 ? activity.childrenCount + " childrens" : ""}

                  </td>
                  
                    </tr>
                          <tr style="background-color: ${index % 2 === 0 ? "" : "#eee"};">
                      <td style="padding: 10px; border: 1px solid #ddd;">Amount:</td>
                      <td style="padding: 10px; border: 1px solid #ddd;">${
                          activity.grandTotal
                      } AED</td>
                    </tr>
                    <tr style="background-color: ${index % 2 === 0 ? "#eee" : ""};">
                    <td style="padding: 10px; border: 1px solid #ddd;">Booking Date:</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${new Date(
                        activity?.date
                    ).toLocaleString("default", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                    })}</td>
                    </tr>
                                   
                    </table>
                    </div>
                    

                   
                  `;
                        })
                        .join("") ?? ""
                }

                    ${
                        transferOrder?.journey
                            ?.map((jour, index) => {
                                // const attachments: [
                                //     {
                                //       filename: 'attachment.txt', // The name you want for the attachment
                                //       content: Buffer.from('This is the content of the attachment', 'utf-8'), // Your buffer content
                                //     },
                                //   ]

                                return `
                      <div>
                      <p style="padding: 10px; font-size: 14px; font-weight: bold;">Transfer ${
                          index + 1
                      }</p>
                      <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
    
                      
                        <tr style="background-color: ${index % 2 === 0 ? "#eee" : ""};">
                        <td style="padding: 10px; border: 1px solid #ddd;">Transfer Type:</td>
                          <td style="padding: 10px; border: 1px solid #ddd;">${
                              jour?.transferType
                          }</td>
                   
                        </tr>
                        <tr style="background-color: ${index % 2 === 0 ? "" : "#eee"};">
                        <td style="padding: 10px; border: 1px solid #ddd;">Total Pax:</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">
                        ${jour?.noOfAdults > 0 ? jour?.noOfAdults + " adults" : ""}
                        ${
                            jour?.noOfChildrens > 0 ? jour?.noOfChildrens + " childrens" : ""
                        }                        </td>
                        </tr>
                        <tr style="background-color: ${index % 2 === 0 ? "#eee" : ""};">
                          <td style="padding: 10px; border: 1px solid #ddd;">Onward Trip:</td>
                          <td style="padding: 10px; border: 1px solid #ddd;">
                          ${
                              jour.trips[0].suggestionType.split("-")[0] === "AIRPORT"
                                  ? jour.trips[0].transferFrom.airportName
                                  : jour.trips[0].transferFrom.name
                          } TO
                          ${
                              jour.trips[0].suggestionType.split("-")[1] === "AIRPORT"
                                  ? jour.trips[0].transferTo.airportName
                                  : jour.trips[0].transferTo.name
                          }
                       </td>
                       </tr>

                       <tr style="background-color: ${index % 2 === 0 ? "" : "#eee"};">
                       <td style="padding: 10px; border: 1px solid #ddd;">Booking Date:</td>
                       <td style="padding: 10px; border: 1px solid #ddd;">${new Date(
                           jour.trips[0]?.pickupDate
                       ).toLocaleString("default", {
                           month: "short",
                           day: "numeric",
                           year: "numeric",
                       })} ${jour.trips[0]?.pickupTime}</td>
                       </tr> 
                       ${
                           jour.trips.length > 1
                               ? `<tr style="background-color: ${index % 2 === 0 ? "#eee" : ""};">
                            <td style="padding: 10px; border: 1px solid #ddd;">Onward Trip:</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">
                                ${
                                    jour.trips[0].suggestionType.split("-")[1] === "AIRPORT"
                                        ? jour.trips[0].transferTo.airportName
                                        : jour.trips[0].transferTo.name
                                }
                                TO
                                ${
                                    jour.trips[0].suggestionType.split("-")[0] === "AIRPORT"
                                        ? jour.trips[0].transferFrom.airportName
                                        : jour.trips[0].transferFrom.name
                                } 
                            </td> 
                        </tr>
                        <tr style="background-color: ${index % 2 === 0 ? "" : "#eee"};">
                            <td style="padding: 10px; border: 1px solid #ddd;">Booking Date:</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${new Date(
                                jour.trips[0]?.pickupDate
                            ).toLocaleString("default", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                            })} ${jour.trips[0]?.pickupTime}</td>
                        </tr>`
                               : ""
                       }
                    
                             
                      
                              <tr style="background-color: ${index % 2 === 0 ? "#eee" : ""};">
                          <td style="padding: 10px; border: 1px solid #ddd;">Amount:</td>
                          <td style="padding: 10px; border: 1px solid #ddd;">${
                              jour.netCost
                          } AED</td>
                        </tr>
                        
                                       
                        </table>
                        </div>
                        
    
                       
                      `;
                            })
                            .join("") ?? ""
                    }

              <p>If you have any questions or concerns regarding your order, please do not hesitate to contact us.</p>
             

              ${footerHtml}

            </div>
          </body>
        
         `,
            product,
            action,
            attachments
        );

        console.log("email has been sent");
    } catch (error) {
        console.log(error);
        console.log("E-mail not sent");
    }
};

module.exports = sendOrderEmail;
