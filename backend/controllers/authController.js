const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const nodemailer = require("nodemailer")
const User = require("../models/User")

// Utility function to send OTP email
async function sendOtpEmail(email, otp) {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    })
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your OTP Code",
        text: `Your OTP code is: ${otp}`,
    })
}

// Signup endpoint - create user + send OTP
async function signup(req, res) {
    try {
        const { name, email, password } = req.body
        const existing = await User.findOne({ email })
        if (existing) return res.status(400).json({ message: "Email already in use" })

        const hash = await bcrypt.hash(password, 12)

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString()

        const user = await User.create({
            name,
            email,
            password: hash,
            verified: false,
            otp,
            otpExpires: Date.now() + 10 * 60 * 1000  // expires in 10 mins
        })

        try {
            await sendOtpEmail(email, otp)
        } catch (err) {
            console.error("Error sending email:", err)
            return res.status(500).json({ message: "Failed to send OTP email. Check mail setup." })
        }

        return res.status(200).json({ message: "OTP sent to your email", userId: user._id })
    } catch (e) {
        return res.status(500).json({ message: "Server error" })
    }
}

// Verify OTP endpoint - verify code, set verified, return token
async function verifyOtp(req, res) {
    try {
        const { email, otp } = req.body
        const user = await User.findOne({ email })
        if (!user || !user.otp) return res.status(400).json({ message: "User or OTP not found" })

        if (user.otp !== otp || Date.now() > user.otpExpires) {
            return res.status(400).json({ message: "Invalid or expired OTP" })
        }

        user.verified = true
        user.otp = undefined
        user.otpExpires = undefined
        await user.save()

        // Issue JWT token after verification
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" })
        res.status(200).json({ token, userId: user._id })
    } catch (e) {
        return res.status(500).json({ message: "Server error" })
    }
}

// Login endpoint - only allows verified users
async function login(req, res) {
    try {
        const { email, password } = req.body
        const user = await User.findOne({ email })
        if (!user) return res.status(404).json({ message: "User not found" })
        if (!user.verified) return res.status(401).json({ message: "Account not verified" })

        const ok = await bcrypt.compare(password, user.password)
        if (!ok) return res.status(400).json({ message: "Invalid credentials" })

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" })
        return res.status(200).json({ token, userId: user._id })
    } catch (e) {
        return res.status(500).json({ message: "Server error" })
    }
}

module.exports = { signup, login, verifyOtp }
