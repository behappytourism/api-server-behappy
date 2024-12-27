const transferOrderCompletHelpers = ({ transferOrder }) => {
    try{
        for (let i = 0; i < transferOrder.journey.length; i++) {
            transferOrder.journey[i].status = "confirmed";
        }
        return transferOrder
    }catch(err){
        throw err
    }
}

module.exports = { transferOrderCompletHelpers }