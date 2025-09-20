require("dotenv").config()
const express = require("express")
const cors = require("cors")

const app = express()

// Parse JSON first
app.use(express.json())

// Allow listed frontends (local + production)
const allowedOrigins = [
    "http://localhost:3000",                  // local Next.js
    process.env.FRONTEND_ORIGIN,              // e.g. https://your-frontend.vercel.app
].filter(Boolean)

// CORS config
app.use(
    cors({
        origin(origin, cb) {
            // Allow server-to-server, Postman, curl (no Origin header)
            if (!origin) return cb(null, true)
            if (allowedOrigins.includes(origin)) return cb(null, true)
            return cb(new Error("Not allowed by CORS"))
        },
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: false, // set to true only if using cookies
    })
)

// Optional: basic security headers
app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff")
    res.setHeader("X-Frame-Options", "DENY")
    next()
})

// Health endpoint
app.get("/", (req, res) => {
    res.json({ ok: true })
})

// Routes
const authRoutes = require("./routes/auth")
app.use("/api/auth", authRoutes)

module.exports = app
