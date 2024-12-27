const xl = require("excel4node");

const createDownloadSummary = async (orders, res) => {
    try {
        // console.log(orders, "ordersordersorders");
        var wb = new xl.Workbook();
        var ws = wb.addWorksheet("Orders");

        const titleStyle = wb.createStyle({
            font: {
                bold: true,
            },
        });

        ws.cell(1, 1).string("Ref No").style(titleStyle);
        ws.cell(1, 2).string("PRN Number").style(titleStyle);
        ws.cell(1, 3).string("Ordered By").style(titleStyle);
        ws.cell(1, 4).string("Onward Date").style(titleStyle);
        ws.cell(1, 5).string("Return Date").style(titleStyle);
        ws.cell(1, 6).string("Traveller Title ").style(titleStyle);
        ws.cell(1, 7).string("Traveller First Name").style(titleStyle);
        ws.cell(1, 8).string("Traveller Last Name").style(titleStyle);
        ws.cell(1, 9).string("Traveller Passport No").style(titleStyle);
        ws.cell(1, 10).string("Infant Title ").style(titleStyle);
        ws.cell(1, 11).string("Infant First Name").style(titleStyle);
        ws.cell(1, 12).string("Infant Last Name").style(titleStyle);
        ws.cell(1, 13).string("Infant Passport No").style(titleStyle);
        ws.cell(1, 14).string("Aiport From").style(titleStyle);
        ws.cell(1, 15).string("Airport To").style(titleStyle);
        ws.cell(1, 16).string("Reference").style(titleStyle);
        ws.cell(1, 17).string("Status").style(titleStyle);
        ws.cell(1, 18).string("Amount").style(titleStyle);

        for (let i = 0; i < orders.length; i++) {
            const order = orders[i];
            ws.cell(i + 2, 1).string(order?.referenceNumber || "N/A");
            ws.cell(i + 2, 2).string(order?.a2aTicket?.pnrNo || "N/A");
            ws.cell(i + 2, 3).string(order?.reseller?.companyName || "N/A");
            ws.cell(i + 2, 4).string(
                new Date(order?.a2aTicket?.onwardDate).toDateString() || "N/A"
            );
            ws.cell(i + 2, 5).string(
                new Date(order?.a2aTicket?.returnDate).toDateString() || "N/A"
            );
            ws.cell(i + 2, 6).string(order?.passengerDetails?.title || "N/A");
            ws.cell(i + 2, 7).string(order?.passengerDetails?.firstName || "N/A");
            ws.cell(i + 2, 8).string(order?.passengerDetails?.lastName || "N/A");
            ws.cell(i + 2, 9).string(order?.passengerDetails?.passportNo || "N/A");
            ws.cell(i + 2, 10).string(order?.passengerDetails?.infantDetails?.title || "N/A");
            ws.cell(i + 2, 11).string(order?.passengerDetails?.infantDetails?.firstName || "N/A");
            ws.cell(i + 2, 12).string(order?.passengerDetails?.infantDetails?.lastName || "N/A");
            ws.cell(i + 2, 13).string(order?.passengerDetails?.infantDetails?.passportNo || "N/A");

            ws.cell(i + 2, 14).string(order?.a2aTicket?.airportFromName || "N/A");
            ws.cell(i + 2, 15).string(order?.a2aTicket?.airportToName || "N/A");
            ws.cell(i + 2, 16).string(order?.passengerDetails?.reference || "N/A");
            ws.cell(i + 2, 17).string(order?.passengerDetails?.status || "N/A");
            ws.cell(i + 2, 18).string(order?.passengerDetails?.amount?.toString() || "N/A");
        }

        wb.write(`FileName.xlsx`, res);
    } catch (err) {
        console.log(err);
        throw err;
    }
};

module.exports = createDownloadSummary;
