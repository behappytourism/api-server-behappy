const checkWalletB2cBalance = (wallet, amount) => {
    try {
        console.log(wallet?.balance, "wallet?.balance", amount);
        if (!wallet || wallet?.balance < Number(amount)) {
            return false;
        }

        return true;
    } catch (err) {
        throw err;
    }
};

module.exports = checkWalletB2cBalance;
