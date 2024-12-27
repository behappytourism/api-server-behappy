const puppeteer = require("puppeteer");

const createPdf = async ({
    hotelQuotation,
    amendment,
    excursionQuotation,
    transferQuotation,
    path,
    reseller,
    quotation,
    excSupplementQuotation,
    guideQuotation,
}) => {
    let airportToCity = [];

    let cityToAirport = [];

    let cityToCity = [];

    for (let i = 0; i < transferQuotation?.stayTransfers?.length; i++) {
        for (let j = 0; j < transferQuotation?.stayTransfers[i]?.transfers?.length; j++) {
            let transfer = transferQuotation.stayTransfers[i].transfers[j];

            console.log(transfer, "transfer");
            if (transfer?.transferType == "airport-city") {
                let selectedIndex = airportToCity.findIndex((arr) => {
                    return arr.transferFromHubName === transfer.transferFromHubName;
                });
                if (selectedIndex !== -1) {
                    airportToCity[selectedIndex].transferTo.push({
                        transferToHubName: transfer.transferToHubName,
                        transferToName: transfer.transferToName,
                    });
                } else {
                    airportToCity.push({
                        transferFromHubName: transfer.transferFromHubName,
                        transferType: transfer.transferType,
                        transferTo: [
                            {
                                transferToHubName: transfer?.transferToHubName,
                                transferToName: transfer.transferToName,
                            },
                        ],
                    });
                }
            } else if (transfer?.transferType == "city-airport") {
                let selectedIndex = cityToAirport.findIndex((arr) => {
                    return arr?.transferToHubName === transfer?.transferToHubName;
                });

                if (selectedIndex !== -1) {
                    cityToAirport[selectedIndex].transferFrom.push({
                        transferFromHubName: transfer.transferFromHubName,
                        transferFromName: transfer.transferFromName,
                    });
                } else {
                    cityToAirport.push({
                        transferToHubName: transfer.transferToHubName,
                        transferType: transfer.transferType,
                        transferToName: transfer.transferToName,
                        transferFrom: [
                            {
                                transferFromHubName: transfer.transferFromHubName,
                                transferFromName: transfer.transferFromName,
                            },
                        ],
                    });
                }
            } else {
                cityToCity.push({
                    transferToHubName: transfer.transferToHubName,
                    transferType: transfer.transferType,
                    transferToName: transfer.transferToName,
                    transferFromHubName: transfer.transferFromHubName,
                    transferFromName: transfer.transferFromName,
                });
            }
        }
    }
    const tranfers = [...airportToCity, ...cityToCity, ...cityToAirport];
    console.log(tranfers, "tranfers)");
    try {
        let index;
        let htmlDoc = `
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
* {
    font-family: 'Poppins', sans-serif;
    font-size: 13px;
    margin: 0;
    padding: 0;
    line-height: 24px;
}
@page 
{ 
    size: A4 portrait;
    margin: 30px; 
}
</style>
    <div>
    <span style="text-transform: capitalize;">Dear ${amendment?.clientName},</span>
    <br />
    <br />
    <span>
        <span style="font-weight: 600;">
             Greetings from ${process.env.COMPANY_NAME}!!!!
        </span>
    </span>
    <br />
    <span>
        Kindly find the below quote for your reference.
    </span>
    <br />
    <br />
    <div style="">
        <table>
                    <tbody>
                        <tr>
                            <td
                                style="padding-right: 10px; padding-top: 2px; padding-bottom: 2px;"
                            >
                            Quotation Number
                            </td>
                            <td
                                style="padding-right: 10px; padding-left: 10px;"
                            >
                                :
                            </td>
                            <td
                                style="padding-right: 10px; padding-left: 10px;"
                            >
                                ${quotation?.quotationNumber}
                            </td>
                        </tr>
                        <tr>
                            <td
                                style="padding-right: 10px; padding-top: 2px; padding-bottom: 2px;"
                            >
                                Total Pax
                            </td>
                            <td
                            style="padding-right: 10px; padding-left: 10px;"
                            >
                                :
                            </td>
                            <td
                            style="padding-right: 10px; padding-left: 10px;"
                            >
                                ${amendment?.noOfAdults ? amendment?.noOfAdults + " Adult" : ""}
                                ${amendment?.noOfAdults && amendment?.noOfChildren ? ", " : " "}
                                ${amendment?.noOfChildren ? amendment?.noOfChildren + " Child" : ""}
                            </td>
                        </tr>
    

                        <tr>
                            <td
                                style="padding-right: 10px; padding-top: 2px; padding-bottom: 2px;"
                            >
                                Package
                            </td>
                            <td
                            style="padding-right: 10px; padding-left: 10px;"
                            >
                                :
                            </td>
                            <td
                            style="padding-right: 10px; padding-left: 10px;"
                            >
                                ${amendment?.noOfNights}N / ${amendment?.noOfNights + 1}D
                            </td>
                        </tr>
                        <tr>
                            <td
                                style="padding-right: 10px; padding-top: 2px; padding-bottom: 2px;"
                            >
                                Check In
                            </td>
                            <td
                            style="padding-right: 10px; padding-left: 10px;"
                            >
                                :
                            </td>
                            <td
                            style="padding-right: 10px; padding-left: 10px;"
                            >
                                ${new Date(amendment?.checkInDate).toDateString()}
                            </td>
                        </tr>
                        <tr>
                            <td
                                style="padding-right: 10px; padding-top: 2px; padding-bottom: 2px;"
                            >
                                Check Out
                            </td>
                            <td
                            style="padding-right: 10px; padding-left: 10px;"
                            >
                                :
                            </td>
                            <td
                            style="padding-right: 10px; padding-left: 10px;"
                            >
                                ${new Date(amendment?.checkOutDate).toDateString()}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <br />

            ${
                hotelQuotation && !hotelQuotation.isAlreadyBooked
                    ? hotelQuotation.stays
                          .map((stay, index) => {
                              return `<div style="margin-bottom : 10px;">
                              <div style="margin-bottom: 10px; font-weight: 600;">Stay ${
                                  index + 1
                              }</div>
                              <table style="width: 100%; text-align: left; border-collapse: collapse;">
                               <thead>
                              <tr>
                              <th style="font-weight: 500; font-size: 14px; border: 1px solid gray; padding: 5px;">
                               Date
                               </th>
                            
                                <th style="font-weight: 500; font-size: 14px; border: 1px solid gray; padding: 5px;">
                                  Name of Hotel
                                </th>
                                <th style="font-weight: 500; font-size: 14px; border: 1px solid gray; padding: 5px;">
                                  Location
                                </th>
                                ${stay?.roomOccupancyList
                                    ?.map((roomOccupancy) => {
                                        return roomOccupancy?.priceWithTransfer
                                            ? `<th style="font-weight: 500; font-size: 14px; border: 1px solid gray; padding: 5px;">
                                                ${roomOccupancy.occupancyShortName}
                                            </th>`
                                            : "";
                                    })
                                    .join("")}
                                

                              </tr>
                              </thead>
                              <tbody>
                              ${stay?.hotels
                                  ?.map((hotel, index) => {
                                      const occupancyList =
                                          index === 0 ? stay?.roomOccupancyList : [];

                                      return `
                                        <tr>
                                        <td style="border: 1px solid gray; padding: 5px; width: 150px; ">
                                        ${
                                            hotel?.checkInDate
                                                ? new Date(hotel?.checkInDate).toLocaleDateString(
                                                      "en-US",
                                                      {
                                                          year: "numeric",
                                                          month: "2-digit",
                                                          day: "2-digit",
                                                      }
                                                  )
                                                : "N/A"
                                        } - ${
                                          hotel?.checkOutDate
                                              ? new Date(hotel?.checkOutDate).toLocaleDateString(
                                                    "en-US",
                                                    {
                                                        year: "numeric",
                                                        month: "2-digit",
                                                        day: "2-digit",
                                                    }
                                                )
                                              : "N/A"
                                      }
                                    </td>
                                    
                                           
                                            
                                            <td style="border: 1px solid gray; padding: 5px; width: 200px; ">
                                                ${hotel?.hotelName ? hotel?.hotelName : "N/A"} (${
                                          hotel?.starCategory ? hotel?.starCategory : "N/A"
                                      } *)
                                              
                                            <div style="display: block; font-size: smaller; margin-top: 4px;">
                                                ${
                                                    hotel?.roomTypeName
                                                        ? hotel?.roomTypeName
                                                        : "N/A"
                                                }- 
                                                ${
                                                    hotel?.boardTypeCode
                                                        ? hotel?.boardTypeCode
                                                        : "N/A"
                                                }
                                            </div>
                                            
                                              </div>
                                            </td>
                                            <td style="border: 1px solid gray; padding: 5px; width: 150px; ">
                                            <div style="display: flex; alignItems:center; whiteSpace:"nowrap"; 
                                            
                                        textOverflow:
                                            ellipsis; ">
                                          <span style="display: block;">
                                          ${hotel?.area},${hotel?.city}, ${
                                          hotel?.country === "united arab emirates"
                                              ? "UAE"
                                              : hotel?.country
                                      }
                                            
                                            </span>
                                            
                                        </div>
                                                                                    </td>
                                            
                                            ${
                                                index < 1
                                                    ? occupancyList
                                                          .map((roomOccupancy) => {
                                                              return roomOccupancy?.priceWithTransfer
                                                                  ? `<td rowspan="${
                                                                        stay?.hotels?.length
                                                                    }" style="border: 1px solid gray; padding: 5px;">
                                                                    ${
                                                                        roomOccupancy?.priceWithTransfer
                                                                            ? Math.ceil(
                                                                                  roomOccupancy?.priceWithTransfer
                                                                              ) +
                                                                              " " +
                                                                              amendment?.quotationCurrency +
                                                                              " PP"
                                                                            : "N/A"
                                                                    }
                                                                </td>
                                                            `
                                                                  : "";
                                                          })
                                                          .join("")
                                                    : ""
                                            }
                                            
                                        </tr>`;
                                  })
                                  .join("")}
                            
                          
                          
                            </tbody>
                          </table>
                        </div>`;
                          })
                          .join("")
                    : `<div>
                      ${
                          amendment?.hotelDisabledRemark
                              ? `<span style="margin-bottom: 2px;" class="cust-border">
                              * ${amendment?.hotelDisabledRemark}
                            </span><br /><br />`
                              : ""
                      }
                      ${
                          amendment?.noOfAdults
                              ? `<div>Per person Adult price: 
                              <span style="font-weight: 500;">
                                ${Math.ceil(amendment?.perPersonAdultPrice)} ${
                                    amendment?.quotationCurrency
                                } PP
                              </span>
                            </div>`
                              : ""
                      }
                      ${
                          amendment?.noOfChildren
                              ? `<div style="margin-top: 4px;">Per person Child price: 
                              <span style="font-weight: 500;">
                                ${Math.ceil(amendment?.perPersonChildPrice)} ${
                                    amendment?.quotationCurrency
                                } PP
                              </span>
                            </div>`
                              : ""
                      }
                    </div>`
            }
              
            <br />
           
                    <div>
                        <h2 style="font-weight: 600;">Inclusions</h2>
                        <ul style="list-style: disc; margin-left: 16px;">
                            ${
                                excursionQuotation
                                    ? excursionQuotation?.excursions
                                          ?.map((excursion) => {
                                              return `<li
                                        style="margin-bottom: 2px;"
                                    >
                                        ${excursion?.excursionName} - 
                                        <span className="capitalize">
                                                ${
                                                    excursion?.excursionType === "ticket"
                                                        ? excursion?.value.toLowerCase() ===
                                                          "ticket"
                                                            ? "Only Ticket"
                                                            : excursion?.value.toLowerCase() ===
                                                              "shared"
                                                            ? "Tickets With SIC Transfer"
                                                            : excursion?.value.toLowerCase() ===
                                                              "private"
                                                            ? "Tickets With PVT Transfer"
                                                            : ""
                                                        : excursion?.excursionType === "transfer"
                                                        ? excursion?.value.toLowerCase() ===
                                                          "private"
                                                            ? "Only Transfer (Private)"
                                                            : excursion?.value.toLowerCase() ===
                                                              "shared"
                                                            ? "Only Transfer (SIC)"
                                                            : ""
                                                        : ""
                                                }
                                            </span>
                                    </li>`;
                                          })
                                          .join("")
                                    : ""
                            }

                            ${
                                guideQuotation
                                    ? guideQuotation?.guides
                                          ?.map((guide) => {
                                              return `<li
                                        style="margin-bottom: 2px;"
                                    >
                                        Guide ${""}${guide?.name} - 
                                        <span className="capitalize">
                                                Duration${""}(${guide.duration}${""}hr X ${""}${
                                                  guide.count
                                              })
                                            </span>
                                    </li>`;
                                          })
                                          .join("")
                                    : ""
                            }

                            
                            
                            ${amendment?.visa?.price ? `<li>Visa included</li>` : ""}
                            <li>All prices inclusive of VAT</li>
                            ${
                                hotelQuotation?.isTourismFeeIncluded === true
                                    ? `<li>Tourism dirham fee inclusive</li>`
                                    : ""
                            }
                        </ul>
                    </div>
             
            <br />

            ${
                tranfers.length > 0
                    ? `<div>
                    <h2 style="font-weight: 600;">
                        Transfers
                    </h2>
                    <ul style="list-style: disc; margin-left: 16px;">
                        ${tranfers
                            ?.map((transfer, index) => {
                                return `<div key=${index} style={{ marginBottom: "2px" }} className="cust-border">
                                    <ul className="list-disc ml-6 text-[12px]">
                                        ${
                                            transfer?.transferType === "airport-city"
                                                ? `<li className="cust-border">
                                                ${transfer?.transferFromHubName} 
                                                <span class="text-xs font-semibold">To</span>
                                                ${transfer?.transferTo?.map((to, i) => {
                                                    return `<span className="cust-border">${
                                                        to?.transferToHubName
                                                    }</span> ${
                                                        i !== transfer?.transferTo?.length - 1
                                                            ? `<span className="cust-border">/</span>`
                                                            : ""
                                                    }`;
                                                })}
                                                - Private Transfer
                                            </li>`
                                                : ""
                                        }
                                        ${
                                            transfer?.transferType === "city-city"
                                                ? `<li className="cust-border">
                                                ${transfer?.transferFromHubName} 
                                                <span class="font-semibold cust-border">To</span> 
                                                ${transfer?.transferToHubName} 
                                                - Private Transfer
                                            </li>`
                                                : ""
                                        }
                                        ${
                                            transfer?.transferType === "city-airport"
                                                ? `<li className="cust-border">
                                                ${transfer?.transferFrom?.map((from, i) => {
                                                    return `<span className="cust-border">${
                                                        from?.transferFromHubName
                                                    }</span> ${
                                                        i !== transfer?.transferFrom?.length - 1
                                                            ? `<span className="cust-border">/</span>`
                                                            : ""
                                                    }`;
                                                })}
                                                <span class="cust-border font-semibold">To</span> 
                                                ${transfer?.transferToHubName} 
                                                - Private Transfer
                                            </li>`
                                                : ""
                                        }
                                    </ul>  
                                </div>`;
                            })
                            .join("")}
                    </ul>
                </div><br />`
                    : ""
            }
            
            
          
            ${
                excSupplementQuotation
                    ? `<div>
                        <h2
                        style="font-weight: 600;"
                        >
                        Optional Tours Cost

                        </h2>

                        <ul
                        style="list-style: disc; margin-left: 16px;"
                        >
                            ${excSupplementQuotation?.excursions
                                ?.map((excursion, index) => {
                                    return `<li
                                            style="margin-bottom: 2px;"
                                        >
                                            ${excursion?.excursionName} - 
                                            <span className="capitalize">
                                                ${
                                                    excursion?.excursionType === "ticket"
                                                        ? excursion?.value === "ticket"
                                                            ? "Only Ticket"
                                                            : excursion?.value === "shared"
                                                            ? "Tickets With SIC Transfer"
                                                            : excursion?.value === "private"
                                                            ? "Tickets With PVT Transfer"
                                                            : ""
                                                        : excursion?.excursionType === "transfer"
                                                        ? excursion?.value === "private"
                                                            ? "Only Transfer (Private)"
                                                            : excursion?.value === "shared"
                                                            ? "Only Transfer (SIC)"
                                                            : ""
                                                        : ""
                                                }
                                            </span>
                                            <span>
                                                 - (Adult - ${
                                                     amendment?.quotationCurrency === "AED"
                                                         ? excursion?.adultPrice
                                                         : (excursion?.adultPrice / 3.65).toFixed(0)
                                                 } ${amendment?.quotationCurrency}, 
                                                Child - 
                                                ${
                                                    amendment?.quotationCurrency === "AED"
                                                        ? excursion?.childPrice
                                                        : (excursion?.childPrice / 3.65)?.toFixed(0)
                                                } ${amendment?.quotationCurrency})
                                            </span>
                                        </li>`;
                                })
                                .join("")}
                        </ul>
                    </div>
                    <br />`
                    : ""
            }
            <div>
                <h2
                style="font-weight: 600;"
                >
                    Terms and Conditions
                </h2>
                <ul
                style="list-style: disc; margin-left: 16px;"
                >
                ${
                    hotelQuotation?.isTourismFeeIncluded === false
                        ? `<li
                            style="margin-bottom: 2px"
                        >
                            Tourism Dirham Fee will pay by guest directly upon
                            Check-in At Above Mentioned Hotels
                        </li>`
                        : ""
                }
                ${
                    !hotelQuotation
                        ? `<li
                        style={{ marginBottom: "2px" }}
                        className="cust-border"
                    >
                        Hotel location should be Bur Dubai Deira only
                        For SIC Transfer & Tours.
                    </li>`
                        : ""
                }
                    <li>
                        All the above package cost is quoted in ${amendment?.quotationCurrency} 
                        per person and is valid till ${new Date(
                            new Date(amendment?.createdAt).setDate(
                                new Date(amendment?.createdAt).getDate() + 2
                            )
                        ).toDateString()}
                    </li>
                    <li>
                    The above rates are subject to change as per hotel's
                    inputs. This could be due to withdrawal of
                    promotional by the Hotel or currency fluctuation or
                    any additional taxes or toll implemented by the
                    Government.
                    </li>
                    <li>
                    Accommodation for Child as stated is as per the
                    child policy of the respective Hotel. Child below 02
                    Years Is considered as an infant and from 02 years
                    to 12 years as a child.
                    </li>
                    <li>
                    Above package rate is subject to availability of
                    rooms and offered inclusions and is subject to
                    change as per availability at the time of booking.
                    Kindly reconfirm with our team before confirming to
                    the client.
                    </li>
                    <li>
                    Cancellation charges are applicable as per the Hotel
                    policy. NRF rates are subject to 100% cancellation
                    charges.
                    </li>
                    <li>
                    All the Services included In the Package are
                    Compulsory and no refund will be given for any
                    un-used services.
                    </li>
                    <li>
                        Tourism Dirham which has been levied by the hotels
                        in Dubai, same has to be paid directly by the guest
                        at the hotel upon check in.
                    </li>
                   
                   
                    <li>
                    Please Note the Check In time is 3:00 PM And check
                    out time Is 12:00 PM. Early Check In or Late Check
                    Out Is depending upon Hotel room availability and
                    may be subject to an extra charge.
                    </li>
                    <li className="cust-border">
                            Rooms And Rates Are Subject To Availability At The
                            Time Of Booking Confirmation kindly reconfirm before
                            the booking.
                        </li>
                </ul>
            </div>
            <br />
        
            
                
            
            
    `;

        // <div>
        //     <div>
        //         <span style={{ fontWeight: 500, fontSize: "16px" }}>
        //             ${reseller?.name || ""}
        //         </span>
        //         <br />
        //         <span style={{ fontSize: "14px" }}>
        //             Email:
        //             <span style={{ color: "blue", textDecoration: "underline" }}>
        //                 ${reseller?.email || "N/A"}
        //             </span>
        //         </span>
        //         <br />
        //         <span style={{ marginTop: "20px" }}>
        //             Mobile/Whatsapp: ${reseller?.phoneNumber || ""} | Tel:
        //             ${reseller?.telephoneNumber || ""} Ext.
        //             ${reseller?.extensionCode || ""}
        //         </span>
        //         <br />
        //         <span style={{}}>Dubai | Ahmedabad | Kenya | Delhi</span>
        //         <br />
        //         <span style={{}}>
        //             Website: www.travellerschoice.ae B2B Agent Login:
        //             https://app.mytcb2b.com/
        //         </span>
        //         <br />
        //         <img
        //             width="150"
        //             src="https://qtn.walletbot.online/static/media/logo.b14b414528609f575e1d.jpg"
        //             alt=""
        //             style={{ marginTop: "15px" }}
        //         />
        //     </div>
        // </div>

        // let browser = await puppeteer.launch({
        //     executablePath: "/usr/bin/chromium-browser",
        //     args: ["--disable-gpu", "--disable-setuid-sandbox", "--no-sandbox", "--no-zygote"],
        // });
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

        await page.setContent(htmlDoc);

        await page.pdf({ path: "." + path, format: "A4" });
        await browser.close();
    } catch (err) {
        throw err;
    }
};

module.exports = createPdf;
