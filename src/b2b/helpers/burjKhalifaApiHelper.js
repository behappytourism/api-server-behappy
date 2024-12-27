const { ApiMaster } = require("../../models");
const axios = require("axios");
const { parseStringPromise } = require("xml2js");
const { getApiHeadersAndUrl } = require("../utils/burjKhalifaHeaderUtils");
const { createBurjKhalifaLog } = require("./attraction/burjKhalifaLogHelper");

module.exports = {
    getTimeSlots: async (activity) => {
        try {
            console.log(activity, "activity");
            const { headers, url, api } = await getApiHeadersAndUrl();

            const xmlData = `
            <Envelope xmlns="http://schemas.xmlsoap.org/soap/envelope/">
            <Body>
                <GetTimeSlot xmlns="http://tickets.atthetop.ae/AgentWebApi">
                <agentId>${parseInt(api.liveAgentId)}</agentId>
                <username>${api.liveUsername}</username>
                <password>${api.livePassword}</password>
                <eventTypeId>${parseInt(activity.productId)}</eventTypeId>
                <resourceId>${parseInt(activity.productCode)}</resourceId>
               <timeSlotDate>${activity.timeSlotDate}</timeSlotDate>
                </GetTimeSlot>
            </Body>
        </Envelope>`;

            const response = await axios.post(url, xmlData, { headers });

            console.log(response.data, "data");

            const json = await parseStringPromise(response.data);

            const agentTickets =
                json["soap:Envelope"]["soap:Body"]["GetTimeSlotResponse"]["GetTimeSlotResult"];

            return agentTickets;

            // const prices =
            //     result["soap:Envelope"]["soap:Body"][0][
            //         "GetTimeSlotWithRatesResponse"
            //     ][0]["GetTimeSlotWithRatesResult"][0][
            //         "dataAgentServiceEventsCollection"
            //     ][0]["AgentServiceEventsPrice"];

            // const leastAdultPrice = Math.min(
            //     ...json["soap:Envelope"]["soap:Body"][0][
            //         "GetTimeSlotWithRatesResponse"
            //     ][0]["GetTimeSlotWithRatesResult"][0][
            //         "dataAgentServiceEventsCollection"
            //     ][0]["AgentServiceEventsPrice"].map((event) =>
            //         parseFloat(event.AdultPrice[0])
            //     )
            // );
            // console.log("Least Adult Price:", leastAdultPrice);
        } catch (err) {
            console.log(err.message, "err");
        }
    },

    getTimeSlotWithRate: async (resourceId, eventTypeId, timeSlotDate, reseller) => {
        try {
            const { headers, url, api } = await getApiHeadersAndUrl();

            const xmlData = `
            <Envelope xmlns="http://schemas.xmlsoap.org/soap/envelope/">
            <Body>
                <GetTimeSlotWithRates xmlns="http://tickets.atthetop.ae/AgentWebApi">
                <agentId>${parseInt(api.liveAgentId)}</agentId>
                        <username>${api.liveUsername}</username>
                        <password>${api.livePassword}</password>
                        <eventTypeId>${parseInt(eventTypeId)}</eventTypeId>
                        <resourceId>${parseInt(resourceId)}</resourceId>
                       <timeSlotDate>${new Date(timeSlotDate).toISOString()}</timeSlotDate>
                </GetTimeSlotWithRates>
            </Body>
        </Envelope>`;

            const response = await axios.post(url, xmlData, { headers });

            const json = await parseStringPromise(response.data);
            createBurjKhalifaLog({
                stepNumber: 1007,
                actionUrl: url,
                request: xmlData,
                response: json,
                referenceNumber: "",
                userId: reseller?._id,
            });
            const agentTicket =
                json["soap:Envelope"]["soap:Body"][0]["GetTimeSlotWithRatesResponse"][0][
                    "GetTimeSlotWithRatesResult"
                ][0];

            if (
                agentTicket.ServiceResponse[0].Status[0] != "Success" ||
                !agentTicket.dataAgentServiceEventsCollection ||
                agentTicket?.dataAgentServiceEventsCollection?.length < 0 ||
                !agentTicket.dataAgentServiceEventsCollection[0].AgentServiceEventsPrice ||
                agentTicket.dataAgentServiceEventsCollection[0].AgentServiceEventsPrice.length < 0
            ) {
                throw new Error("Time Slot Not Available Now.");
            }

            let agentTickets = agentTicket.dataAgentServiceEventsCollection[0];

            const objects = agentTickets.AgentServiceEventsPrice.map((event) => {
                return {
                    EventID: event.EventID[0],
                    EventName: event.EventName[0],
                    StartDateTime: event.StartDateTime[0],
                    EndDateTime: event.EndDateTime[0],
                    ResourceID: event.ResourceID[0],
                    Available: event.Available[0],
                    Status: event.Status[0],
                    AdultPrice: event.AdultPrice[0],
                    ChildPrice: event.ChildPrice[0],
                };
            });

            // console.log(objects, "objects");

            return objects;
        } catch (err) {
            throw err;
        }
    },

    getAgentTickets: async (res) => {
        try {
            const { headers, url, api } = await getApiHeadersAndUrl();

            const xmlData = `
            <?xml version="1.0" encoding="utf-8"?>
             <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
                 <soap:Body>
                  <GetAgentTickets xmlns="http://tickets.atthetop.ae/AgentWebApi">
                  <agentId>${api.liveAgentId}</agentId>
                  <userName>${api.liveUsername}</userName>
                  <password>${api.livePassword}</password>
                  </GetAgentTickets>
                </soap:Body>
              </soap:Envelope>`;

            const response = await axios.post(url, xmlData, { headers });
            console.log(response.data);

            const json = await parseStringPromise(response.data);

            const agentTickets =
                json["soap:Envelope"]["soap:Body"]["GetAgentTicketsResponse"][
                    "GetAgentTicketsResult"
                ];

            return agentTickets;
        } catch (err) {
            console.log(err.message, "eror");
        }
    },

    getTicketType: async (data, EventTypeID, adultCount, childCount, reseller, referenceNumber) => {
        try {
            const { headers, url, api } = await getApiHeadersAndUrl();

            const xmlData = `
            <Envelope xmlns="http://schemas.xmlsoap.org/soap/envelope/">
               <Body>
            <GetTicketTypes xmlns="http://tickets.atthetop.ae/AgentWebApi">
            <agentId>${api.liveAgentId}</agentId>
            <userName>${api.liveUsername}</userName>
            <password>${api.livePassword}</password>
            <selectedTimeSlot>
                <EventID>${parseInt(data.EventID)}</EventID>
                <EventName>${data.EventName}</EventName>
                <StartDateTime>${new Date(data.StartDateTime).toISOString()}</StartDateTime>
                <EndDateTime>${data.EndDateTime}</EndDateTime>
                <EventTypeID>${parseInt(EventTypeID)}</EventTypeID>
                <ResourceID>${parseInt(data.ResourceID)}</ResourceID>
                <Available>${parseInt(data.Available)}</Available>
                <Status>${parseInt(data.Status)}</Status>
                </selectedTimeSlot>
                </GetTicketTypes>
                </Body>
                </Envelope>`;

            createBurjKhalifaLog({
                stepNumber: 1001,
                actionUrl: url,
                request: xmlData,
                response: "",
                referenceNumber: referenceNumber,
                userId: reseller?._id,
            });

            const response = await axios.post(url, xmlData, { headers });

            const json = await parseStringPromise(response.data);
            createBurjKhalifaLog({
                stepNumber: 1004,
                actionUrl: url,
                request: xmlData,
                response: json,
                referenceNumber: referenceNumber,
                userId: reseller?._id,
            });
            const ticketType =
                json["soap:Envelope"]["soap:Body"][0]["GetTicketTypesResponse"][0][
                    "GetTicketTypesResult"
                ][0];

            if (ticketType.ServiceResponse[0].Status[0] != "Success") {
                throw new Error("Ticket Type Not Available Now.");
            }

            const ticketTypes = ticketType.TicketTypesCollection[0];

            const objects = ticketTypes.AgentServiceTicketTypes.filter(
                (ticket) =>
                    (adultCount > 0 && ticket.c_TicketTypeCode[0] === "AD") ||
                    (childCount > 0 && ticket.c_TicketTypeCode[0] === "CH")
            ).map((ticket) => {
                let Qty = ticket.Qty[0] ? null : undefined;

                if (adultCount > 0 && ticket.c_TicketTypeCode[0] === "AD") {
                    Qty = adultCount;
                } else if (childCount > 0 && ticket.c_TicketTypeCode[0] === "CH") {
                    Qty = childCount;
                }

                return {
                    i_TicketTypeId: ticket.i_TicketTypeId[0],
                    v_Group: ticket.v_Group[0],
                    EventTypeID: ticket.EventTypeID[0],
                    c_TicketTypeCode: ticket.c_TicketTypeCode[0],
                    v_TicketTypeDesc: ticket.v_TicketTypeDesc[0],
                    v_Code: ticket.v_Code[0],
                    v_Description: ticket.v_Description[0],
                    i_TicketPrice: ticket.i_TicketPrice[0],
                    i_BookingFee: ticket.i_BookingFee[0],
                    Qty: Qty,
                    c_Delete: ticket.c_Delete[0],
                    StartDate: ticket.StartDate[0],
                    EndDate: ticket.EndDate[0],
                    i_TicketId: ticket.i_TicketId[0],
                    AttractionTicketId: ticket.AttractionTicketId[0],
                };
            });

            return objects;
        } catch (err) {
            console.log(err, "err");
        }
    },

    saveTicket: async (ticketData, EventTypeID, data, reseller, referenceNumber) => {
        try {
            const { headers, url, api } = await getApiHeadersAndUrl();

            const xmlData = `<Envelope xmlns="http://schemas.xmlsoap.org/soap/envelope/">
                <Body>
                <SaveTicket xmlns="http://tickets.atthetop.ae/AgentWebApi">
                <agentId>${api.liveAgentId}</agentId>
                <userName>${api.liveUsername}</userName>
                <password>${api.livePassword}</password>
                    <selectedTimeSlot>
                    <EventID>${parseInt(data.EventID)}</EventID>
                    <EventName>${data.EventName}</EventName>
                    <StartDateTime>${new Date(data.StartDateTime).toISOString()}</StartDateTime>
                    <EndDateTime>${data.EndDateTime}</EndDateTime>
                    <EventTypeID>${parseInt(EventTypeID)}</EventTypeID>
                    <ResourceID>${parseInt(data.ResourceID)}</ResourceID>
                    <Available>${parseInt(data.Available)}</Available>
                    <Status>${parseInt(data.Status)}</Status>
                    </selectedTimeSlot>
                    <bookingCollection>
                        ${ticketData
                            .map(
                                (ticket) => `
                            <AgentServiceTicketTypes>
                                <i_TicketTypeId>${parseInt(ticket.i_TicketTypeId)}</i_TicketTypeId>
                                <v_Group>${ticket.v_Group}</v_Group>
                                <EventTypeID>${parseInt(ticket.EventTypeID)}</EventTypeID>
                                <c_TicketTypeCode>${ticket.c_TicketTypeCode}</c_TicketTypeCode>
                                <v_TicketTypeDesc>${ticket.v_TicketTypeDesc}</v_TicketTypeDesc>
                                <v_Code>${ticket.v_Code}</v_Code>
                                <v_Description>${ticket.v_Description}</v_Description>
                                <i_TicketPrice>${ticket.i_TicketPrice}</i_TicketPrice>
                                <i_BookingFee>${ticket.i_BookingFee}</i_BookingFee>
                                <Qty>${ticket.Qty || ""}</Qty>
                                <c_Delete>${ticket.c_Delete}</c_Delete>
                                <StartDate>${ticket.StartDate}</StartDate>
                                <EndDate>${ticket.EndDate}</EndDate>
                                <i_TicketId>${ticket.i_TicketId}</i_TicketId>
                                <AttractionTicketId>${
                                    ticket.AttractionTicketId
                                }</AttractionTicketId>
                            </AgentServiceTicketTypes>
                          `
                            )
                            .join("")}
                    </bookingCollection>
                </SaveTicket>
            </Body>
        </Envelope>`;

            createBurjKhalifaLog({
                stepNumber: 1002,
                actionUrl: url,
                request: xmlData,
                response: "",
                referenceNumber: referenceNumber,
                userId: reseller?._id,
            });
            const response = await axios.post(url, xmlData, { headers });

            const json = await parseStringPromise(response.data);
            console.log(json);
            createBurjKhalifaLog({
                stepNumber: 1005,
                actionUrl: url,
                request: xmlData,
                response: json,
                referenceNumber: referenceNumber,
                userId: reseller?._id,
            });
            const bookingId =
                json["soap:Envelope"]["soap:Body"][0]["SaveTicketResponse"][0][
                    "SaveTicketResult"
                ][0];

            console.log(bookingId);

            // console.log(
            //     bookingId.ServiceResponse[0].Status[0],
            //     "bookingId.ServiceResponse[0].Status[0] "
            // );

            if (bookingId.ServiceResponse[0].Status[0] != "Success") {
                throw new Error("Cannot Save Ticket Now.");
            }

            return bookingId.BookingId[0];
        } catch (err) {
            throw err;
        }
    },

    confirmTicket: async (name, bookingId, VoucherNum, reseller, referenceNumber) => {
        try {
            const { authHeader, url, api } = await getApiHeadersAndUrl();

            const headers = {
                "Content-Type": "text/xml; charset=utf-8",
                Authorization: authHeader,
            };

            const xmlData = `
            <Envelope xmlns="http://schemas.xmlsoap.org/soap/envelope/">
            <Body>
                <ConfirmTicket xmlns="http://tickets.atthetop.ae/AgentWebApi">
                <agentId>${api.liveAgentId}</agentId>
                <userName>${api.liveUsername}</userName>
                <password>${api.livePassword}</password>
                    <VoucherNum>${VoucherNum}</VoucherNum>
                    <guestName>${name}</guestName>
                    <BookingId>${bookingId}</BookingId>
                </ConfirmTicket>
            </Body>
            </Envelope>
            `;

            createBurjKhalifaLog({
                stepNumber: 1003,
                actionUrl: url,
                request: xmlData,
                response: "",
                referenceNumber: referenceNumber,
                userId: reseller?._id,
            });

            const response = await axios.post(url, xmlData, { headers });

            const json = await parseStringPromise(response.data);
            createBurjKhalifaLog({
                stepNumber: 1006,
                actionUrl: url,
                request: xmlData,
                response: json,
                referenceNumber: referenceNumber,
                userId: reseller?._id,
            });
            const bookings =
                json["soap:Envelope"]["soap:Body"][0]["ConfirmTicketResponse"][0][
                    "ConfirmTicketResult"
                ][0];

            if (bookings.ServiceResponse[0].Status[0] != "Success") {
                throw new Error(" Cannot Confirm Ticket Now.");
            }

            const booking =
                json["soap:Envelope"]["soap:Body"][0]["ConfirmTicketResponse"][0][
                    "ConfirmTicketResult"
                ][0]["AgentServiceBookingResult"][0];

            // const adultTicket = [];
            // const childTicket = [];

            // Loop through each ETicketItem and populate the appropriate ticket array
            // booking.ETicket[0].ETickets[0].ETicketItem.forEach((item) => {
            //     const ticketTypeId = parseInt(item.i_TicketTypeId[0]);
            //     if (ticketTypeId === 63) {
            //         adultTicket.push(item.TicketNo[0]);
            //     } else if (ticketTypeId === 64) {
            //         childTicket.push(item.TicketNo[0]);
            //     }
            // });

            const bookingObject = {
                UserName: booking.UserName[0],
                BookingAmount: parseInt(booking.BookingAmount[0]),
                BookingDateTime: new Date(booking.BookingDateTime[0]),
                OrderNo: booking.OrderNo[0],
                AgentName: booking.AgentName[0],
                GuestName: booking.GuestName[0],
                VoucherNo: booking.VoucherNo[0],
                VisitDateTime: new Date(booking.VisitDateTime[0]),
                // adultTicket,
                // childTicket,
            };

            console.log(bookingObject, "bookingObject");

            return bookingObject;
        } catch (err) {
            throw err;
        }
    },

    orderDetailsBooking: async (orderId) => {
        try {
            const { headers, url, api } = await getApiHeadersAndUrl();

            const xmlData = `
            <Envelope xmlns="http://schemas.xmlsoap.org/soap/envelope/">
            <Body>
            <GetOrderDetailsByBookingId xmlns="http://tickets.atthetop.ae/AgentWebApi">
            <agentId>${api.liveAgentId}</agentId>
            <userName>${api.liveUsername}</userName>
            <password>${api.livePassword}</password>
            <bookingId>${orderId}</bookingId>
            </GetOrderDetailsByBookingId>
            </Body>
            </Envelope>

            
            `;

            console.log(xmlData, "saveTicket");

            const response = await axios.post(url, xmlData, { headers });

            console.log(response.data, "data");

            const json = await parseStringPromise(response.data);

            const details =
                json["soap:Envelope"]["soap:Body"][0]["GetOrderDetailsByBookingIdResponse"][0][
                    "GetOrderDetailsByBookingIdResult"
                ][0]["dataBookingDetailsCollection"];

            // if (details.ServiceResponse[0].Status[0] != "Success") {
            //     throw new Error("Order Details Are Not Available Now.");
            // }

            // console.log(details, "orderDetails");

            // const orderDetails = details.AgentServiceBookingInfoDetails.map(
            //     (detail) => {
            //         return {
            //             i_TicketTypeId: detail.i_TicketTypeId[0],
            //             i_PropertyId: detail.i_PropertyId[0],
            //             v_Group: detail.v_Group[0],
            //             c_TicketTypeCode: detail.c_TicketTypeCode[0],
            //             v_TicketTypeDesc: detail.v_TicketTypeDesc[0],
            //             v_Code: detail.v_Code[0],
            //             v_Description: detail.v_Description[0],
            //             i_TicketPrice: detail.i_TicketPrice[0],
            //             i_BookingFee: detail.i_BookingFee[0],
            //             c_Delete: detail.c_Delete[0],
            //             i_TicketId: detail.i_TicketId[0],
            //             StartDate: detail.StartDate[0],
            //             EndDate: detail.EndDate[0],
            //             i_ticketQuantity: detail.i_ticketQuantity[0],
            //             i_totalAmount: detail.i_totalAmount[0],
            //             dt_ticketDate: detail.dt_ticketDate[0],
            //             guestName: detail.guestName[0],
            //             vGalaxyOrderId: detail.vGalaxyOrderId[0],
            //             OrderId: detail.OrderId[0],
            //             status: detail.status[0],
            //         };
            //     }
            // );

            console.log(details);

            return details;
        } catch (err) {
            throw err;
        }
    },

    orderDetails: async (orderId) => {
        try {
            const { headers, url, api } = await getApiHeadersAndUrl();

            const xmlData = `
            <Envelope xmlns="http://schemas.xmlsoap.org/soap/envelope/">
            <Body>
            <GetOrderDetails xmlns="http://tickets.atthetop.ae/AgentWebApi">
            <agentId>${api.liveAgentId}</agentId>
            <userName>${api.liveUsername}</userName>
            <password>${api.livePassword}</password>
            <Orderid>${orderId}</Orderid>
            </GetOrderDetails>
            </Body>
            </Envelope>

            
            `;

            console.log(xmlData, "saveTicket");

            const response = await axios.post(url, xmlData, { headers });

            console.log(response.data, "data");

            const json = await parseStringPromise(response.data);

            const details =
                json["soap:Envelope"]["soap:Body"][0]["GetOrderDetailsResponse"][0][
                    "GetOrderDetailsResult"
                ][0]["dataBookingDetailsCollection"];

            if (details.ServiceResponse[0].Status[0] != "Success") {
                throw new Error("Order Details Are Not Available Now.");
            }

            console.log(details, "orderDetails");

            const orderDetails = details.AgentServiceBookingInfoDetails.map((detail) => {
                return {
                    i_TicketTypeId: detail.i_TicketTypeId[0],
                    i_PropertyId: detail.i_PropertyId[0],
                    v_Group: detail.v_Group[0],
                    c_TicketTypeCode: detail.c_TicketTypeCode[0],
                    v_TicketTypeDesc: detail.v_TicketTypeDesc[0],
                    v_Code: detail.v_Code[0],
                    v_Description: detail.v_Description[0],
                    i_TicketPrice: detail.i_TicketPrice[0],
                    i_BookingFee: detail.i_BookingFee[0],
                    c_Delete: detail.c_Delete[0],
                    i_TicketId: detail.i_TicketId[0],
                    StartDate: detail.StartDate[0],
                    EndDate: detail.EndDate[0],
                    i_ticketQuantity: detail.i_ticketQuantity[0],
                    i_totalAmount: detail.i_totalAmount[0],
                    dt_ticketDate: detail.dt_ticketDate[0],
                    guestName: detail.guestName[0],
                    vGalaxyOrderId: detail.vGalaxyOrderId[0],
                    OrderId: detail.OrderId[0],
                    status: detail.status[0],
                };
            });

            console.log(orderDetails);

            return orderDetails;
        } catch (err) {
            throw err;
        }
    },

    generateBookingPdf: async (bookingId) => {
        try {
            const { headers, url, api } = await getApiHeadersAndUrl();

            const xmlData = `
            <Envelope xmlns="http://schemas.xmlsoap.org/soap/envelope/">
            <Body>
            <GeneratebookingPDF xmlns="http://tickets.atthetop.ae/AgentWebApi">
            <agentId>${api.liveAgentId}</agentId>
            <userName>${api.liveUsername}</userName>
            <password>${api.livePassword}</password>
            <bookingId>${bookingId}</bookingId>
            </GeneratebookingPDF>
            </Body>
            </Envelope>`;

            console.log(xmlData, "saveTicket");

            const response = await axios.post(url, xmlData, { headers });

            console.log(response.data, "data");

            const json = await parseStringPromise(response.data);

            const details =
                json["soap:Envelope"]["soap:Body"][0]["GeneratebookingPDFResponse"][0][
                    "GetOrderDetailsResult"
                ][0];

            console.log(details, "orderDetails");

            return details;
        } catch (err) {
            console.log(err, "err");
        }
    },

    cancelBooking: async (orderId) => {
        try {
            const { headers, url, api } = await getApiHeadersAndUrl();

            const xmlData = `
            <Envelope xmlns="http://schemas.xmlsoap.org/soap/envelope/">
            <Body>
                <CancelBooking xmlns="http://tickets.atthetop.ae/AgentWebApi">
                <agentId>${api.liveAgentId}</agentId>
                <userName>${api.liveUsername}</userName>
                <password>${api.livePassword}</password>
                <Orderid>${orderId}</Orderid>
                </CancelBooking>
            </Body>
        </Envelope>
            `;

            const response = await axios.post(url, xmlData, { headers });

            console.log(response, "response");
            const json = await parseStringPromise(response.data);

            const cancelOrder =
                json["soap:Envelope"]["soap:Body"][0]["CancelBookingResponse"][0][
                    "CancelBookingResult"
                ][0];

            return cancelOrder;
        } catch (err) {
            console.log(err);
            throw err;
        }
    },

    testCredit: async () => {
        try {
            const { headers, url, api } = await getApiHeadersAndUrl();

            const xmlData = `
            <Envelope xmlns="http://www.w3.org/2003/05/soap-envelope">
            <Body>
                <testcredit xmlns="http://tickets.atthetop.ae/AgentWebApi">
                    <agentno>${api.liveAgentId}</agentno>
                </testcredit>
            </Body>
        </Envelope>
            `;

            const response = await axios.post(url, xmlData, { headers });

            const json = await parseStringPromise(response.data);

            console.log(response, "response");

            const balance =
                json["soap:Envelope"]["soap:Body"][0]["testcreditResponse"][0][
                    "testcreditResult"
                ][0];

            console.log(balance, "balance");

            return balance;
        } catch (err) {}
    },
};
