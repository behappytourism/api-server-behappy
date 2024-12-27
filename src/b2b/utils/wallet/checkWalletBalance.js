const checkWalletBalance = (wallet, amount) => {
    try {
        if (
            !wallet ||
            wallet?.balance + (wallet?.creditAmount - wallet?.creditUsed) < Number(amount)
        ) {
            return false;
        }

        return true;
    } catch (err) {
        throw err;
    }
};

module.exports = checkWalletBalance;
