require("dotenv").config()
const mongoose = require("mongoose")
const app = require("./app")

const PORT = process.env.PORT || 5000
const MONGO_URI = process.env.MONGODB_URI

mongoose
    .connect(MONGO_URI)
    .then(() => {
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
    })
    .catch(err => {
        console.error("MongoDB connection error:", err)
        process.exit(1)
    })
