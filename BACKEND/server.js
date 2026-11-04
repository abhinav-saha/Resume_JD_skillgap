require("dotenv").config()

const app = require("./src/app")
const connectToDB = require("./src/config/database")

const PORT = process.env.PORT || 3000

async function startServer() {
    try {
        await connectToDB()

        // Start BullMQ worker
        require("./src/workers/interview.worker")

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server is running on port ${PORT}`)
        })
    } catch (err) {
        console.error("Server startup failed:", err)
        process.exit(1)
    }
}

startServer()
