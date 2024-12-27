const { Types, isValidObjectId } = require("mongoose");
const xl = require("excel4node");

module.exports = {
    createVisaDownloadSummary: (orders, res) => {
        try {
            console.log(orders, "ordersordersorders");
            var wb = new xl.Workbook();
            var ws = wb.addWorksheet("Orders");

            const titleStyle = wb.createStyle({
                font: {
                    bold: true,
                },
            });

            ws.cell(1, 1).string("Ref No").style(titleStyle);
            ws.cell(1, 2).string("Onward Date").style(titleStyle);
            ws.cell(1, 3).string("Return Date").style(titleStyle);
            ws.cell(1, 4).string("Traveller Title ").style(titleStyle);
            ws.cell(1, 5).string("Traveller First Name").style(titleStyle);
            ws.cell(1, 6).string("Traveller Last Name").style(titleStyle);
            ws.cell(1, 7).string("Traveller Passport No").style(titleStyle);
            ws.cell(1, 8).string("Visa Type").style(titleStyle);
            ws.cell(1, 9).string("Visa Country").style(titleStyle);
            ws.cell(1, 10).string("Status").style(titleStyle);
            ws.cell(1, 11).string("Amount").style(titleStyle);

            for (let i = 0; i < orders.length; i++) {
                const order = orders[i];
                ws.cell(i + 2, 1).string(order?.referenceNumber || "N/A");
                ws.cell(i + 2, 2).string(new Date(order?.onwardDate).toDateString() || "N/A");
                ws.cell(i + 2, 3).string(new Date(order?.returnDate).toDateString() || "N/A");
                ws.cell(i + 2, 4).string(order?.travellers?.title || "N/A");
                ws.cell(i + 2, 5).string(order?.travellers?.firstName || "N/A");
                ws.cell(i + 2, 6).string(order?.travellers?.lastName || "N/A");
                ws.cell(i + 2, 7).string(order?.travellers?.passportNo || "N/A");
                ws.cell(i + 2, 8).string(order?.visaType?.visaName || "N/A");
                ws.cell(i + 2, 9).string(order?.visa?.name || "N/A");
                ws.cell(i + 2, 10).string(order?.travellers?.isStatus || "N/A");
                ws.cell(i + 2, 11).number(order?.totalAmount || "N/A");
            }

            wb.write(`FileName.xlsx`, res);
        } catch (err) {
            console.log(err);
            throw err;
        }
    },
};
