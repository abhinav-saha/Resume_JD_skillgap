const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5
});

const generateReportLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 7
});

module.exports = {
    loginLimiter,
    registerLimiter,
    generateReportLimiter
};