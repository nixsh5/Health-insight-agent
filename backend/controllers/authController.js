// backend/controllers/authController.js

const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const User = require("../models/User")

async function signup(req, res) {
    try {
        const { name, email, password } = req.body
        const existing = await User.findOne({ email })
        if (existing) return res.status(400).json({ message: "Email already in use" })

        const hash = await bcrypt.hash(password, 12)
        const user = await User.create({ name, email, password: hash })
        return res.status(201).json({ message: "User created", userId: user._id })
    } catch (e) {
        return res.status(500).json({ message: "Server error" })
    }
}

async function login(req, res) {
    try {
        const { email, password } = req.body
        const user = await User.findOne({ email })
        if (!user) return res.status(404).json({ message: "User not found" })

        const ok = await bcrypt.compare(password, user.password)
        if (!ok) return res.status(400).json({ message: "Invalid credentials" })

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" })
        return res.status(200).json({ token, userId: user._id })
    } catch (e) {
        return res.status(500).json({ message: "Server error" })
    }
}

module.exports = { signup, login }
