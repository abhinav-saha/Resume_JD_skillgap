const express = require("express")
const authMiddleware = require("../middlewares/auth.middleware")
const interviewController = require("../controllers/interview.controller")
const upload = require("../middlewares/file.middleware")
const { generateReportLimiter } = require("../middlewares/rateLimiter")

const interviewRouter = express.Router()

// Generate interview report (enqueue job)
interviewRouter.post(
    "/",
    authMiddleware.authUser,
    generateReportLimiter,
    upload.single("resume"),
    interviewController.generateInterViewReportController
)

// Check report-generation job status
interviewRouter.get(
    "/status/:jobId",
    authMiddleware.authUser,
    interviewController.getInterviewReportJobStatusController
)

// Get interview report by ID
interviewRouter.get(
    "/report/:interviewId",
    authMiddleware.authUser,
    interviewController.getInterviewReportByIdController
)

// Get all interview reports
interviewRouter.get(
    "/",
    authMiddleware.authUser,
    interviewController.getAllInterviewReportsController
)

// Generate resume PDF
interviewRouter.post(
    "/resume/pdf/:interviewReportId",
    authMiddleware.authUser,
    interviewController.generateResumePdfController
)

module.exports = interviewRouter
