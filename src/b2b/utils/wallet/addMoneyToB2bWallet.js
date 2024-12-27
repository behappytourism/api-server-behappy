const addMoneyToB2bWallet = async (wallet, amount) => {
    try {
        const creditAmount = Number(amount);
        if (creditAmount > 0 && !isNaN(creditAmount)) {
            let totalCreditUsed = wallet?.creditUsed || 0;
            if (totalCreditUsed > 0) {
                if (totalCreditUsed >= creditAmount) {
                    wallet.creditUsed -= creditAmount;
                    await wallet.save();
                } else {
                    wallet.balance = wallet.balance + (creditAmount - totalCreditUsed);
                    wallet.creditUsed = 0;
                    await wallet.save();
                }
            } else {
                wallet.balance += creditAmount;
                await wallet.save();
            }
        } else {
            throw new Error("invalid credit amount");
        }
    } catch (err) {
        throw new Error(err);
    }
};

module.exports = addMoneyToB2bWallet;
