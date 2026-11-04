import axios from "axios"

const api = axios.create({
    baseURL: "https://resume-jd-skillgap.onrender.com",
    withCredentials: true,
})

/**
 * Generate interview report (adds a BullMQ job).
 */
export const generateInterviewReport = async ({
    jobDescription,
    selfDescription,
    resumeFile
}) => {
    const formData = new FormData()

    formData.append("jobDescription", jobDescription)
    formData.append("selfDescription", selfDescription)
    formData.append("resume", resumeFile)

    const response = await api.post("/api/interview/", formData)

    return response.data
}

/**
 * Get BullMQ job status.
 */
export const getInterviewReportJobStatus = async (jobId) => {
    const response = await api.get(`/api/interview/status/${jobId}`)

    return response.data
}

/**
 * Get interview report by ID.
 */
export const getInterviewReportById = async (interviewId) => {
    const response = await api.get(`/api/interview/report/${interviewId}`)

    return response.data
}

/**
 * Get all interview reports.
 */
export const getAllInterviewReports = async () => {
    const response = await api.get("/api/interview/")

    return response.data
}

/**
 * Generate resume PDF.
 */
export const generateResumePdf = async ({ interviewReportId }) => {
    const response = await api.post(
        `/api/interview/resume/pdf/${interviewReportId}`,
        null,
        { responseType: "blob" }
    )

    return response.data
}
