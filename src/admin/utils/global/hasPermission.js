const hasPermission = ({ roles, name, permission }) => {
    let returnValue = false;

    for (let i = 0; i < roles?.length; i++) {
        let role = roles[i];
        for (let j = 0; j < role?.roles?.length; j++) {
            if (
                role?.roles[j]?.name === name &&
                role?.roles[j]?.permissions?.includes(permission)
            ) {
                returnValue = true;
                break;
            }
        }
    }

    return returnValue;
};

module.exports = hasPermission;
