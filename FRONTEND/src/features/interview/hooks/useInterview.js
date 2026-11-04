import {
    getAllInterviewReports,
    generateInterviewReport,
    getInterviewReportById,
    getInterviewReportJobStatus,
    generateResumePdf
} from "../services/interview.api"

import { useContext, useEffect, useState } from "react"
import { InterviewContext } from "../interview.context"
import { useParams } from "react-router"

export const useInterview = () => {

    const context = useContext(InterviewContext)
    const { interviewId } = useParams()

     const [progress, setProgress] = useState(0)
    const [stage, setStage] = useState("Preparing your interview plan...")


    if (!context) {
        throw new Error("useInterview must be used within an InterviewProvider")
    }

    const {
        loading,
        setLoading,
        report,
        setReport,
        reports,
        setReports
    } = context

   
    // Generate report using BullMQ
    const generateReport = async ({
        jobDescription,
        selfDescription,
        resumeFile
    }) => {
        setLoading(true)
        setProgress(2)
        setStage("Uploading your resume...")

        try {
            // 1. Add job to BullMQ
            const response = await generateInterviewReport({
                jobDescription,
                selfDescription,
                resumeFile
            })

            const { jobId } = response

            if (!jobId) {
                throw new Error("Job ID was not received.")
            }

            setProgress(5)
            setStage("Your report is queued. Starting analysis...")

            // 2. Poll job status every 2 seconds
            const maxAttempts = 150

            for (let i = 0; i < maxAttempts; i++) {

                const statusResponse =
                    await getInterviewReportJobStatus(jobId)

                // Update progress and stage from backend
                if (typeof statusResponse.progress === "number") {
                    setProgress(current =>
                        Math.max(
                            current,
                            Math.min(statusResponse.progress, 99)
                        )
                    )
                }

                if (statusResponse.stage) {
                    setStage(statusResponse.stage)
                }

                // 3. Job completed
                if (statusResponse.status === "completed") {
                    setProgress(100)
                    setStage("Report ready!")

                    // 4. Fetch generated report from MongoDB
                    const reportResponse = await getInterviewReportById(
                        statusResponse.interviewReportId
                    )

                    setReport(reportResponse.interviewReport)

                    return reportResponse.interviewReport
                }

                // 5. Job failed
                if (statusResponse.status === "failed") {
                    throw new Error(
                        statusResponse.error ||
                        statusResponse.message ||
                        "Report generation failed."
                    )
                }

                // Wait before the next status check
                if (i < maxAttempts - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000))
                }
            }

            throw new Error(
                "Report generation is taking too long. Please check your recent reports later."
            )

        } catch (error) {
            console.error("Error generating interview report:", error)
            throw error

        } finally {
            setLoading(false)
        }
    }

    // Get report by ID
    const getReportById = async (interviewId) => {
        setLoading(true)

        try {
            const response = await getInterviewReportById(interviewId)

            setReport(response.interviewReport)

            return response.interviewReport

        } catch (error) {
            console.error(error)
            return null

        } finally {
            setLoading(false)
        }
    }

    // Get all reports
    const getReports = async () => {
        setLoading(true)

        try {
            const response = await getAllInterviewReports()

            setReports(response.interviewReports)

            return response.interviewReports

        } catch (error) {
            console.error(error)
            return []

        } finally {
            setLoading(false)
        }
    }

    // Generate resume PDF
    const getResumePdf = async (interviewReportId) => {
        setLoading(true)

        try {
            const response = await generateResumePdf({ interviewReportId })

            const url = window.URL.createObjectURL(
                new Blob([response], { type: "application/pdf" })
            )

            const link = document.createElement("a")

            link.href = url
            link.setAttribute(
                "download",
                `resume_${interviewReportId}.pdf`
            )

            document.body.appendChild(link)
            link.click()

            link.remove()
            window.URL.revokeObjectURL(url)

        } catch (error) {
            console.error(error)

        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (interviewId) {
            getReportById(interviewId)
        } else {
            getReports()
        }
    }, [interviewId])

    return {
        loading,
        progress,
        stage,
        report,
        reports,
        generateReport,
        getReportById,
        getReports,
        getResumePdf
    }
}
