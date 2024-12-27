const deductAmountFromWallet = async (wallet, amount) => {
    try {
        const tmpAmount = Number(amount);
        if (tmpAmount > 0) {
            if (wallet.balance < tmpAmount) {
                wallet.creditUsed += Number(tmpAmount) - wallet.balance;
                wallet.balance = 0;
                await wallet.save();
            } else {
                wallet.balance -= tmpAmount;
                await wallet.save();
            }
        }
    } catch (err) {
        throw new Error(err);
    }
};

module.exports = deductAmountFromWallet;
