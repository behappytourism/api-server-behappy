const b2bResellerAuth = require("./b2bResellerAuth");
const b2bAuth = require("./b2bAuth");
const apiAccess = require("./b2bApiAccessMiddleware/apiAccess")

module.exports = { b2bResellerAuth, b2bAuth, apiAccess };
