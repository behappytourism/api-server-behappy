const deductMoneyFromB2cWallet = async (wallet, amount) => {
    try {
        const tmpAmount = Number(amount);
        if (tmpAmount > 0) {
            wallet.balance -= tmpAmount;
            await wallet.save();
        }
    } catch (err) {
        throw new Error(err);
    }
};

module.exports = deductMoneyFromB2cWallet;
