const sendHotelPayLaterOrderCancelEmailToAdmin = require("./sendHotelPayLaterOrderCancelEmailToAdmin");
const sendHotelPayLaterPaymentAlertEmail = require("./sendHotelPayLaterPaymentAlertEmail");
const cancellationConfirmationEmailToReseller = require("./cancellationConfirmationEmailToReseller");
const hotelOrderConfirmationEmail = require("./hotelOrderConfirmationEmail");
const hotelOrderCancellationRequestEmailForDpt = require("./hotelOrderCancellationRequestEmailForDpt");
const hotelOrderCancellationRequestEmailForReseller = require("./hotelOrderCancellationRequestEmailForReseller");
const hotelSubmitEnquiryEmail = require("./hotelSubmitEnquiryEmail");
const sendHotelReservationEmail = require("./sendHotelReservationEmail");
const sendHotelOrderPaymentCompletionEmail = require("./sendHotelOrderPaymentCompletionEmail");

module.exports = {
    sendHotelPayLaterOrderCancelEmailToAdmin,
    sendHotelPayLaterPaymentAlertEmail,
    cancellationConfirmationEmailToReseller,
    hotelOrderConfirmationEmail,
    hotelOrderCancellationRequestEmailForDpt,
    hotelOrderCancellationRequestEmailForReseller,
    hotelSubmitEnquiryEmail,
    sendHotelReservationEmail,
    sendHotelOrderPaymentCompletionEmail,
};
