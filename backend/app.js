require("dotenv").config()
const express = require("express")
const cors = require("cors")

const app = express()

app.use(express.json())

const allowedOrigins = [
    "http://localhost:3000",          // local dev frontend
    process.env.FRONTEND_ORIGIN       // production frontend domain from env var
].filter(Boolean)

app.use(
    cors({
        origin(origin, cb) {
            if (!origin) return cb(null, true) // allow non-browser requests
            if (allowedOrigins.includes(origin)) return cb(null, true)
            return cb(new Error("Not allowed by CORS"))
        },
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: false, // change to true only if using cookies
    })
)

// Optional security headers
app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff")
    res.setHeader("X-Frame-Options", "DENY")
    next()
})

// Health check endpoint
app.get("/", (req, res) => {
    res.json({ ok: true })
})

// Import and mount auth routes
const authRoutes = require("./routes/auth")
app.use("/api/auth", authRoutes)

// Fallback for unmatched routes
app.use((req, res) => res.status(404).json({ message: "Route not found" }))

module.exports = app
