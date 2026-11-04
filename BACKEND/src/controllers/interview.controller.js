
const pdfParse = require("pdf-parse")
const { generateResumePdf } = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")
const { getCache, setCache } = require("../services/cache.service")
const interviewQueue = require("../queues/interview.queue")

/**
 * Add report-generation job to BullMQ.
 */
async function generateInterViewReportController(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "Resume PDF is required."
            })
        }

        const resumeContent = await (
            new pdfParse.PDFParse(Uint8Array.from(req.file.buffer))
        ).getText()

        const { selfDescription, jobDescription } = req.body

        const job = await interviewQueue.add(
            "generate-report",
            {
                resume: resumeContent.text,
                selfDescription,
                jobDescription,
                userId: req.user.id
            },
            {
                attempts: 2,
                backoff: {
                    type: "exponential",
                    delay: 5000
                },
                removeOnComplete: {
                    age: 3600,
                    count: 100
                },
                removeOnFail: {
                    age: 86400,
                    count: 100
                }
            }
        )

        return res.status(202).json({
            message: "Interview report generation started.",
            jobId: job.id
        })

    } catch (err) {
        console.error("Error adding report job:", err)

        return res.status(500).json({
            message: "Failed to start report generation."
        })
    }
}

/**
 * Get report-generation job status and progress.
 */
async function getInterviewReportJobStatusController(req, res) {
    try {
        const { jobId } = req.params

        const job = await interviewQueue.getJob(jobId)

        if (!job || String(job.data.userId) !== String(req.user.id)) {
            return res.status(404).json({
                message: "Job not found."
            })
        }

        const state = await job.getState()

        const progressData =
            typeof job.progress === "object" && job.progress !== null
                ? job.progress
                : { percentage: job.progress }

        // Job completed
        if (state === "completed") {
            return res.status(200).json({
                status: "completed",
                progress: 100,
                stage: "Report ready!",
                interviewReportId: job.returnvalue?.interviewReportId
            })
        }

        // Job failed
        if (state === "failed") {
            return res.status(200).json({
                status: "failed",
                progress: progressData.percentage ?? 0,
                stage: "Generation failed",
                message: "Report generation failed.",
                error: job.failedReason
            })
        }

        // Job waiting or currently processing
        return res.status(200).json({
            status: state,
            progress: progressData.percentage ?? 0,
            stage: progressData.stage ||
                "Waiting for worker..."
        })

    } catch (err) {
        console.error("Error checking job status:", err)

        return res.status(500).json({
            message: "Error checking job status."
        })
    }
}

/**
 * Get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res) {
    try {
        const { interviewId } = req.params
        const userId = req.user.id

        const cacheKey = `report:${userId}:${interviewId}`

        const cachedReport = await getCache(cacheKey)

        if (cachedReport) {
            return res.status(200).json({
                message: "Interview report fetched from cache",
                interviewReport: cachedReport
            })
        }

        const interviewReport = await interviewReportModel.findOne({
            _id: interviewId,
            user: userId
        })

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found"
            })
        }

        await setCache(cacheKey, interviewReport)

        return res.status(200).json({
            message: "Interview report fetched from database",
            interviewReport
        })

    } catch (err) {
        return res.status(500).json({
            message: "Error fetching interview report"
        })
    }
}

/**
 * Get all interview reports of logged-in user.
 */
async function getAllInterviewReportsController(req, res) {
    const interviewReports = await interviewReportModel
        .find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")

    res.status(200).json({
        message: "Interview reports fetched successfully.",
        interviewReports
    })
}

/**
 * Generate resume PDF.
 */
async function generateResumePdfController(req, res) {
    const { interviewReportId } = req.params

    const interviewReport = await interviewReportModel.findById(interviewReportId)

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    const { resume, jobDescription, selfDescription } = interviewReport

    const pdfBuffer = await generateResumePdf({
        resume,
        jobDescription,
        selfDescription
    })

    res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
    })

    res.send(pdfBuffer)
}

module.exports = {
    generateInterViewReportController,
    getInterviewReportJobStatusController,
    getInterviewReportByIdController,
    getAllInterviewReportsController,
    generateResumePdfController
}
