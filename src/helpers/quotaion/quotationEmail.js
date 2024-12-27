const sendEmail = require("../../helpers/sendEmail");
const commonFooter = require("../../helpers/commonFooter");

const sentQuotationEmail = async ({
    path,
    reseller,
    amendment,
    excursionQuotation,
    hotelQuotation,
    quotation,
    transferQuotation,
    excSupplementQuotation,
    comments,
    status,
    guideQuotation,
}) => {
    try {
        const footerHtml = await commonFooter();

        sendEmail(
            reseller.email,
            `Quotation  ${quotation?.quotationNumber}  ${status ? status : ""}`,
            `
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
                                        ${
                                            amendment?.noOfAdults
                                                ? amendment?.noOfAdults + " Adult"
                                                : ""
                                        }
                                        ${
                                            amendment?.noOfAdults && amendment?.noOfChildren
                                                ? ", "
                                                : " "
                                        }
                                        ${
                                            amendment?.noOfChildren
                                                ? amendment?.noOfChildren + " Child"
                                                : ""
                                        }
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
                hotelQuotation
                    ? hotelQuotation?.stays
                          ?.map((stay, index) => {
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
                                  Star Category
                                </th>
                                <th style="font-weight: 500; font-size: 14px; border: 1px solid gray; padding: 5px;">
                                  Name of Hotel
                                </th>
                                <th style="font-weight: 500; font-size: 14px; border: 1px solid gray; padding: 5px;">
                                  Location
                                </th>
                                ${stay?.roomOccupancyList
                                    ?.map((roomOccupancy) => {
                                        return `<th style="font-weight: 500; font-size: 14px; border: 1px solid gray; padding: 5px;">
                                      ${roomOccupancy?.occupancyShortName}
                                    </th>`;
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
                                        <td style="border: 1px solid gray; padding: 5px; width: 150px;">
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
                                            <span style="display: block; font-size: smaller; margin-top: 4px;">
                                                ${
                                                    hotel?.roomTypeName
                                                        ? hotel?.roomTypeName
                                                        : "N/A"
                                                }  - 
                                                ${
                                                    hotel?.boardTypeCode
                                                        ? hotel?.boardTypeCode
                                                        : "N/A"
                                                }
                                                
                                            </span>
                                            
                                            </td>
                                            <td style="border: 1px solid gray; padding: 5px;">
                                            <div style="display: flex; alignItems:center; gap: 2rem; ">
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
                                                              console.log(
                                                                  occupancyList,
                                                                  "occupancyLists"
                                                              );
                                                              return roomOccupancy?.priceWithTransfer
                                                                  ? `
                                                                <td rowspan="${
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
                                                                : excursion?.excursionType ===
                                                                  "transfer"
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
                                                        Duration${""}(${
                                                          guide.duration
                                                      }${""}hr X ${""}${guide.count})
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
                        transferQuotation &&
                        transferQuotation?.stayTransfers[0].transfers &&
                        transferQuotation?.stayTransfers[0].transfers[0]
                            ? `<div>
                            <h2 style="font-weight: 600;">
                                Transfers
                            </h2>
                            <ul style="list-style: disc; margin-left: 16px;">
                                ${transferQuotation?.stayTransfers
                                    ?.map((stayTransfer, index) => {
                                        return `<li key=${index} style={{ marginBottom: "2px" }} className="cust-border">
                                            Stay ${stayTransfer?.stayNo} 
                                            ${
                                                stayTransfer?.transfers &&
                                                stayTransfer?.transfers?.length > 0
                                                    ? stayTransfer?.transfers
                                                          ?.map((transfer, index) => {
                                                              return `<div className="capitalize">
                                                            ${
                                                                transfer?.transferType ===
                                                                "city-city"
                                                                    ? `${transfer.transferFromHubName}  - ${transfer.transferToHubName}`
                                                                    : transfer?.transferType ===
                                                                      "airport-city"
                                                                    ? `${transfer.transferFromHubName} (airport) - ${transfer.transferToHubName} `
                                                                    : `${transfer.transferFromHubName}  - ${transfer.transferToHubName} (airport)`
                                                            }
                                                        </div>`;
                                                          })
                                                          .join("") // Move join here
                                                    : "N/A"
                                            }
                                        </li>`;
                                    })
                                    .join("")}
                            </ul>
                        </div><br />`
                            : ""
                    }
                  
                    ${
                        excSupplementQuotation?.excursions
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
                                                                : excursion?.excursionType ===
                                                                  "transfer"
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
                                                                 : (
                                                                       excursion?.adultPrice / 3.65
                                                                   ).toFixed(0)
                                                         } ${amendment?.quotationCurrency}, 
                                                        Child - 
                                                        ${
                                                            amendment?.quotationCurrency === "AED"
                                                                ? excursion?.childPrice
                                                                : (
                                                                      excursion?.childPrice / 3.65
                                                                  )?.toFixed(0)
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
                                All the above package cost is quoted in ${
                                    amendment?.quotationCurrency
                                } 
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
                                Guest need to carry QR code vaccine certificate &
                                required to provide a negative PCR test result
                                acquired within 48 hours in Dubai only , to enter
                                Grand Mosque/Ferrari world Or any Mall visit at Abu
                                Dhabi.
                            </li>
                            <li>
                                PCR cost Not included in above rates
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
                
                    
                     
                   
                    
            `
        );
    } catch (err) {
        console.log(err);
    }
};

module.exports = sentQuotationEmail;
