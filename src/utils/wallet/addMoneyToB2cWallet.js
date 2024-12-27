const addMoneyToB2cWallet = async (wallet, amount) => {
    try {
        const creditAmount = Number(amount);
        if (creditAmount > 0 && !isNaN(creditAmount)) {
            wallet.balance += creditAmount;
            await wallet.save();
        } else {
            throw new Error("invalid credit amount");
        }
    } catch (err) {
        throw new Error(err);
    }
};

module.exports = addMoneyToB2cWallet;
