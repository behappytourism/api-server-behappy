const router = require("express").Router();

const {
    addNewVoucher,
    getAllDailyReports,
    updateVoucher,
    downloadVoucherExcel,
    getVoucherInitialData,
    downloadVoucherPdf,
    getAllVouchers,
    deleteSingleVoucher,
    getSingleVoucher,
    updateVocherSingleTourStatus,
    updateVoucherCancellationStatus,
    downloadVoucherExcelByTourType,
} = require("../../controllers/voucher/vouchersController");

router.post("/add", addNewVoucher);
router.patch("/update/:id", updateVoucher);
router.get("/all", getAllVouchers);
router.get("/daily-reports", getAllDailyReports);
router.get("/tour-type/excel/download", downloadVoucherExcelByTourType);
router.get("/excel/download", downloadVoucherExcel);
router.get("/:id/pdf/download", downloadVoucherPdf);
router.get("/initial-data", getVoucherInitialData);
router.get("/single/:id", getSingleVoucher);
router.delete("/delete/:id", deleteSingleVoucher);
router.patch("/cancellation/udpate", updateVoucherCancellationStatus);
router.patch("/tour-status/update", updateVocherSingleTourStatus);

module.exports = router;
