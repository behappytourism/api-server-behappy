var xl = require("excel4node");
const path = require("path");

const createQtnSheet = async ({
    quotationNumber,
    totalPax,
    noOfAdults,
    noOfChildren,
    transferQuotation,
    hotelQuotation,
    excursionQuotation,
    visa,
    markup,
    markupType,
    quotationCurrency,
    amendmentNo,
    perPersonAdultPrice,
    perPersonChildPrice,
    agent,
    checkInDate,
    checkOutDate,
    noOfNights,
    otbPrice,
    isTransferQuotationDisabled,
    perPersonAdultMarketMarkup,
    perPersonAdultProfileMarkup,
    perPersonChildMarketMarkup,
    perPersonChildProfileMarkup,
    isHotelQuotationDisabled,
    isSupplimentQuotationDisabled,
    isExcursionQuotationDisabled,
    isCustomMarkup,
    customMarkup,
    customMarkupType,
    guideQuotation,
}) => {
    try {
        const wb = new xl.Workbook();
        const sheetStyle = wb.createStyle({
            font: {
                bold: true,
            },
        });

        const ws = wb.addWorksheet(`${quotationNumber} - ${amendmentNo}`);

        let row = 1;

        ws.cell(row, 1).string("Quotation Number").style(sheetStyle);
        row++;
        ws.cell(row, 1).string(quotationNumber);
        row += 2;

        ws.cell(row, 1).string("Total No.of Pax").style(sheetStyle);
        row++;
        ws.cell(row, 1).number(Number(totalPax) || 0);
        row--;

        ws.cell(row, 2).string("No of Aduts").style(sheetStyle);
        row++;
        ws.cell(row, 2).number(Number(noOfAdults) || 0);
        row--;

        ws.cell(row, 3).string("No of Children").style(sheetStyle);
        row++;
        ws.cell(row, 3).number(Number(noOfChildren) || 0);
        row--;

        ws.cell(row, 4).string("Check-in Date").style(sheetStyle);
        row++;
        ws.cell(row, 4).string(new Date(checkInDate).toDateString() || "N/A");
        row--;

        ws.cell(row, 5).string("Check-out Date").style(sheetStyle);
        row++;
        ws.cell(row, 5).string(new Date(checkOutDate).toDateString() || "N/A");
        row--;

        ws.cell(row, 6).string("No Of Nights").style(sheetStyle);
        row++;
        ws.cell(row, 6).number(Number(noOfNights) || 0);
        row += 2;

        // Hotel Quotation
        if (isTransferQuotationDisabled === false) {
            ws.cell(row, 1).string("Transfer Quotation").style(sheetStyle);
            row++;

            for (let k = 0; k < transferQuotation?.stayTransfers?.length; k++) {
                let stay = transferQuotation?.stayTransfers[k];
                ws.cell(row, 1)
                    .string(`Transfer ${k + 1}`)
                    .style(sheetStyle);
                row++;

                ws.cell(row, 1).string("Transfer From").style(sheetStyle);
                ws.cell(row, 2).string("Transfer To").style(sheetStyle);
                ws.cell(row, 3).string("Transfer Type").style(sheetStyle);
                ws.cell(row, 4).string("Price inc markup").style(sheetStyle);
                ws.cell(row, 5).string("Market Markup").style(sheetStyle);
                ws.cell(row, 6).string("Profile Markup").style(sheetStyle);

                ws.cell(row, 7).string("TotalCapacity").style(sheetStyle);

                row++;

                for (let i = 0; i < stay?.transfers.length; i++) {
                    const transfer = stay.transfers[i];
                    ws.cell(row, 1).string(transfer?.transferFromName || "N/A");
                    ws.cell(row, 2).string(transfer?.transferToName || "N/A");
                    ws.cell(row, 3).string(transfer?.transferType || "N/A");
                    ws.cell(row, 4).number(transfer?.ppTotalPricePerTransfer || 0);
                    ws.cell(row, 5).number(transfer?.marketMarkup || 0);
                    ws.cell(row, 6).number(transfer?.profileMarkup || 0);
                    ws.cell(row, 7).number(transfer?.transferCapacity || 0);

                    row++;
                }

                row += 2;

                ws.cell(row, 1).string("Total");
                ws.cell(row, 2).string("N/A");
                ws.cell(row, 3).string("N/A");
                ws.cell(row, 4).number(stay?.ppTotalPricePerStayTransfer || 0);
                ws.cell(row, 5).number(stay?.ppTotalMarketMarkupPerStayTransfer || 0);
                ws.cell(row, 6).number(stay?.ppTotalProfileMarkupPerStayTransfer || 0);
                ws.cell(row, 7).string("N/A");

                row += 2; // add extra space between hotels
            }
        }

        // Hotel Quotation
        if (hotelQuotation) {
            ws.cell(row, 1).string("Hotel Quotation").style(sheetStyle);
            row++;

            for (let k = 0; k < hotelQuotation.stays.length; k++) {
                let stay = hotelQuotation.stays[k];

                ws.cell(row, 1).string("Hotel Name").style(sheetStyle);
                ws.cell(row, 2).string("Check In").style(sheetStyle);
                ws.cell(row, 3).string("Check Out").style(sheetStyle);

                ws.cell(row, 4).string("SGL").style(sheetStyle);
                ws.cell(row, 5).string("DBL").style(sheetStyle);
                ws.cell(row, 6).string("TPL").style(sheetStyle);
                ws.cell(row, 7).string("CWB").style(sheetStyle);
                ws.cell(row, 8).string("CNB").style(sheetStyle);

                row++;

                for (let i = 0; i < stay.hotels.length; i++) {
                    const hotel = stay.hotels[i];

                    ws.cell(row, 1).string(hotel.hotelName || "");
                    ws.cell(row, 2).string(new Date(hotel.checkInDate).toDateString() || "N/A");

                    ws.cell(row, 3).string(new Date(hotel.checkOutDate).toDateString() || "N/A");

                    for (let j = 0; j < hotel.roomOccupancies.length; j++) {
                        ws.cell(row, 4 + j).number(Number(hotel.roomOccupancies[j].price) || 0);
                    }

                    row++;

                    ws.cell(row, 1).string("Market Markup" || "");
                    ws.cell(row, 2).string("N/A" || "");

                    ws.cell(row, 3).string("N/A" || "");

                    for (let j = 0; j < hotel.roomOccupancies.length; j++) {
                        ws.cell(row, 4 + j).number(
                            Number(hotel.roomOccupancies[j].marketMarkup) || 0
                        );
                    }

                    row++;

                    ws.cell(row, 1).string("Profile Markup" || "");
                    ws.cell(row, 2).string("N/A" || "");

                    ws.cell(row, 3).string("N/A" || "");

                    for (let j = 0; j < hotel.roomOccupancies.length; j++) {
                        ws.cell(row, 4 + j).number(
                            Number(hotel.roomOccupancies[j].profileMarkup) || 0
                        );
                    }

                    row++;
                }

                row += 2; // add extra space between hotels
            }
        }

        if (excursionQuotation) {
            ws.cell(row, 1).string("Excursion Quotation").style(sheetStyle);
            row++;
            ws.cell(row, 1).string("Excursion Name").style(sheetStyle);
            ws.cell(row, 2).string("Adult Price Inc Markup").style(sheetStyle);
            ws.cell(row, 3).string("Market Markup").style(sheetStyle);
            ws.cell(row, 4).string("Profile Markup").style(sheetStyle);

            ws.cell(row, 5).string("Child Price Inc Markup").style(sheetStyle);
            ws.cell(row, 6).string("Market Markup").style(sheetStyle);
            ws.cell(row, 7).string("Profile Markup").style(sheetStyle);
            ws.cell(row, 8).string("Pvt Transfer Price").style(sheetStyle);

            ws.cell(row, 9).string("Pvt Transfer Market Markup").style(sheetStyle);
            ws.cell(row, 10).string("Pvt Transfer Profile Markup").style(sheetStyle);

            row++;

            for (let i = 0; i < excursionQuotation?.excursions?.length; i++) {
                const excursion = excursionQuotation?.excursions[i];

                ws.cell(row, 1).string(excursion?.excursionName || "");
                ws.cell(row, 2).number(Number(excursion?.adultPrice) || 0);
                ws.cell(row, 3).number(Number(excursion?.adultMarketMarkup) || 0);
                ws.cell(row, 4).string("N/A");
                ws.cell(row, 5).number(Number(excursion?.childPrice) || 0);

                ws.cell(row, 6).number(Number(excursion?.childMarketMarkup) || 0);
                ws.cell(row, 7).string("N/A");
                ws.cell(row, 8).number(Number(excursion?.pvtTransferPrice) || 0);
                ws.cell(row, 9).number(Number(excursion?.pvtTransferMarketMarkup) || 0);
                ws.cell(row, 10).string("N/A");

                row++;
            }
            row++;

            ws.cell(row, 1).string("Excursion Total");
            ws.cell(row, 2).number(Number(excursionQuotation?.adultTotal) || 0);
            ws.cell(row, 3).number(Number(excursionQuotation?.adultMarketMarkup) || 0);
            ws.cell(row, 4).number(excursionQuotation?.adultProfileMarkup || 0);
            ws.cell(row, 5).number(excursionQuotation?.childrenTotal || 0);
            ws.cell(row, 6).number(excursionQuotation?.childMarketMarkup || 0);
            ws.cell(row, 7).number(excursionQuotation?.childProfileMarkup || 0);
            ws.cell(row, 8).string("N/A");

            ws.cell(row, 9).number(excursionQuotation?.pvtTransferMarketMarkup || 0);
            ws.cell(row, 10).number(excursionQuotation?.pvtTransferProfileMarkup || 0);

            row += 2;
        }

        if (guideQuotation) {
            ws.cell(row, 1).string("Guide Quotation").style(sheetStyle);
            row++;
            ws.cell(row, 1).string("Name").style(sheetStyle);
            ws.cell(row, 2).string("Duration").style(sheetStyle);
            ws.cell(row, 3).string("Count").style(sheetStyle);
            ws.cell(row, 4).string("Price").style(sheetStyle);
            row++;

            for (let i = 0; i < guideQuotation?.guides?.length; i++) {
                const guide = guideQuotation?.guides[i];

                ws.cell(row, 1).string(guide?.name || "");
                ws.cell(row, 2).number(Number(guide?.duration) || 0);
                ws.cell(row, 3).number(Number(guide?.count) || 0);
                ws.cell(row, 4).number(Number(guide?.price) || 0);

                row++;
            }
            row++;

            ws.cell(row, 1).string("Guide Total");
            ws.cell(row, 2).number(Number(guideQuotation?.totalPrice) || 0);
        }

        if (visa) {
            ws.cell(row, 1).string("Visa").style(sheetStyle);
            row++;

            ws.cell(row, 1).string("Visa Name").style(sheetStyle);
            ws.cell(row, 2).string("Adult Price with markup").style(sheetStyle);
            ws.cell(row, 3).string("Market Markup").style(sheetStyle);
            ws.cell(row, 4).string("Porfile Markup").style(sheetStyle);

            ws.cell(row, 5).string("Child Price with markup").style(sheetStyle);
            ws.cell(row, 6).string("Market Markup").style(sheetStyle);
            ws.cell(row, 7).string("Porfile Markup").style(sheetStyle);
            ws.cell(row, 8).string("OTB Price").style(sheetStyle);
            row++;

            ws.cell(row, 1).string(visa?.visaName || "");
            ws.cell(row, 2).number(Number(visa?.adultPrice) || 0);
            ws.cell(row, 3).number(Number(visa?.adultMarketMarkup) || 0);

            ws.cell(row, 4).number(Number(visa?.adultProfileMarkup) || 0);
            ws.cell(row, 5).number(Number(visa?.childPrice) || 0);
            ws.cell(row, 6).number(Number(visa?.childMarketMarkup) || 0);
            ws.cell(row, 7).number(Number(visa?.childProfileMarkup) || 0);
            ws.cell(row, 8).number(Number(otbPrice) || 0);
            row += 2;
        }

        // ws.cell(row, 1).string("Markup");
        // ws.cell(row, 2).string(
        //     `${markup} ${markupType === "flat" ? " " + quotationCurrency?.toUpperCase() : "%"}`
        // );
        // row += 2;

        if (hotelQuotation) {
            ws.cell(row, 1).string("Total").style(sheetStyle);
            row += 2;

            for (let i = 0; i < hotelQuotation?.stays?.length; i++) {
                let index = 1;
                const stay = hotelQuotation?.stays[i];
                ws.cell(row, 1).string("Stay").style(sheetStyle);

                for (let j = 0; j < stay.roomOccupancyList?.length; j++) {
                    ws.cell(row, 2 + j)
                        .string(`${stay.roomOccupancyList[j]?.occupancyShortName || "N/A"}`)
                        .style(sheetStyle);
                }
                row += 1;

                ws.cell(row, 1).string(`Stay${i + 1}`);
                for (let j = 0; j < stay.roomOccupancyList?.length; j++) {
                    ws.cell(row, 2 + j).string(
                        `${
                            stay.roomOccupancyList[j]?.priceWithTransfer?.toFixed(2) || 0
                        } ${quotationCurrency?.toUpperCase()}`
                    );
                }
                row += 1;

                ws.cell(row, 1).string(`Market Markup Stay${i + 1}`);
                for (let j = 0; j < stay.roomOccupancyList?.length; j++) {
                    ws.cell(row, 2 + j).string(
                        `${
                            Number(stay.roomOccupancyList[j]?.perPersonMarketMarkup?.toFixed(2)) ||
                            0
                        } ${quotationCurrency?.toUpperCase()}`
                    );
                }

                row += 1;

                ws.cell(row, 1).string(`Profile Markup Stay${i + 1}`);
                for (let j = 0; j < stay.roomOccupancyList?.length; j++) {
                    ws.cell(row, 2 + j).string(
                        `${
                            Number(stay.roomOccupancyList[j]?.perPersonProfileMarkup?.toFixed(2)) ||
                            0
                        } ${quotationCurrency?.toUpperCase()}`
                    );
                }

                row += 2;
                index++;
            }
            row += 2; // increment row after all rows have been inserted
        } else {
            ws.cell(row, 1).string("Total").style(sheetStyle);
            row++;
            ws.cell(row, 1).string("Adult Total With Markup").style(sheetStyle);
            ws.cell(row, 2).string(
                `${perPersonAdultPrice?.toFixed(2)} ${quotationCurrency?.toUpperCase()}`
            );
            ws.cell(row, 3).string("Adult Market Markup").style(sheetStyle);
            ws.cell(row, 4).string(
                `${perPersonAdultMarketMarkup?.toFixed(2)} ${quotationCurrency?.toUpperCase()}`
            );
            ws.cell(row, 5).string("Adult Profile Markup").style(sheetStyle);
            ws.cell(row, 6).string(
                `${perPersonAdultProfileMarkup?.toFixed(2)} ${quotationCurrency?.toUpperCase()}`
            );
            row++;
            ws.cell(row, 1).string("Child Total").style(sheetStyle);
            ws.cell(row, 2).string(
                `${perPersonChildPrice?.toFixed(2)} ${quotationCurrency?.toUpperCase()}`
            );
            ws.cell(row, 3).string("Child Market Markup").style(sheetStyle);
            ws.cell(row, 4).string(
                `${perPersonChildMarketMarkup?.toFixed(2)} ${quotationCurrency?.toUpperCase()}`
            );
            ws.cell(row, 5).string("Child Profile Markup").style(sheetStyle);
            ws.cell(row, 6).string(
                `${perPersonChildProfileMarkup?.toFixed(2)} ${quotationCurrency?.toUpperCase()}`
            );

            row += 2;
        }

        if (isCustomMarkup === true) {
            ws.cell(row, 1).string("Custom  Markup Type").style(sheetStyle);
            ws.cell(row, 2).string("Custom  Markup ").style(sheetStyle);

            row += 2;

            ws.cell(row, 1).string(customMarkupType || "");
            ws.cell(row, 2).number(Number(customMarkup) || 0);
        }

        let quotationSheet = `/public/quotations/${quotationNumber}-${amendmentNo}.xlsx`;
        wb.write(path.resolve(__dirname, `../../../..${quotationSheet}`));

        return quotationSheet;
    } catch (err) {
        console.log(err, "eroorooo");
        throw err;
    }
};

module.exports = createQtnSheet;
