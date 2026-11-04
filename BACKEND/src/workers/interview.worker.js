require("dotenv").config()

const { Worker } = require("bullmq")
const IORedis = require("ioredis")


const { generateInterviewReport } = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")

const connection = new IORedis(
    process.env.REDIS_URL || "redis://127.0.0.1:6379",
    { maxRetriesPerRequest: null }
)

const worker = new Worker(
    "interview-report",
    async (job) => {
        const { resume, selfDescription, jobDescription, userId } = job.data

        console.log("Generating report for job:", job.id)

        await job.updateProgress({
            percentage: 5,
            stage: "Starting interview report generation..."
        })

        await job.updateProgress({
            percentage: 10,
            stage: "Analyzing your resume and job description..."
        })

        // Gradually increase estimated progress while AI generation runs.
        let isGenerating = true
        let percentage = 10

        const progressUpdater = (async () => {
            while (isGenerating && percentage < 80) {
                await new Promise(resolve => setTimeout(resolve, 2500))

                if (!isGenerating) break

                percentage = Math.min(percentage + 5, 80)

                let stage

                if (percentage <= 30) {
                    stage = "Analyzing your resume and job description..."
                } else if (percentage <= 55) {
                    stage = "Generating interview questions..."
                } else if (percentage <= 75) {
                    stage = "Building your preparation plan..."
                } else {
                    stage = "Finishing your interview report..."
                }

                try {
                    await job.updateProgress({ percentage, stage })
                } catch (err) {
                    console.error("Progress update failed:", err.message)
                    break
                }
            }
        })()

        let generatedReport

        try {
            generatedReport = await generateInterviewReport({
                resume,
                selfDescription,
                jobDescription
            })
        } finally {
            isGenerating = false
            await progressUpdater
        }

        await job.updateProgress({
            percentage: 85,
            stage: "AI report generated successfully!"
        })

        await job.updateProgress({
            percentage: 95,
            stage: "Saving your interview report..."
        })

        const interviewReport = await interviewReportModel.create({
            user: userId,
            resume,
            selfDescription,
            jobDescription,
            ...generatedReport
        })

        return {
            interviewReportId: interviewReport._id.toString()
        }
    },
    { connection }
)

worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`)
})

worker.on("failed", (job, err) => {
    console.log(`Job ${job?.id} failed:`, err.message)
})

console.log("Worker started and waiting for jobs")

module.exports = worker