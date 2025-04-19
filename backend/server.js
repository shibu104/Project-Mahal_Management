const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const booking = require('./compo/booking.js');
const expense = require('./compo/expense.js');
const billing = require('./compo/billing.js');

const app = express();
const PORT = 5000;
// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// Route no of Pages
app.use('/api', booking)
app.use('/api', expense)
app.use('/api', billing)

const verifytoken = async (req, res, next) => {
    try {
        
        const token = req.headers.authorization;
        
        if (token) {
            await jwt.verify(token, 'fallbackSecretKey', (err, decoded) => {
                if (err) {
                    return res.send({ msg: "un authorized" })
                } else {
                    
                    req.id = decoded.id;
                    req.role = decoded.role;
                    next()
                }
            })
        } else {
            return res.send({ msg: "bad auth" })
        }

    } catch (error) {
        console.log("middleware error :", error)
    }
}

// MongoDB Schema
mongoose.connect("mongodb+srv://nsamahal2025:nsamahal@nsamahal.7mjkovv.mongodb.net/booking", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

const LogSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: { type: String, enum: ['superadmin', 'admin'], required: true },
});

const Log = mongoose.model('Log', LogSchema);

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    try {
        const user = await Log.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid email or password.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid email or password.' });
        }
        const jwtSecret = process.env.JWT_SECRET || 'fallbackSecretKey';
        const token = jwt.sign({ id: user._id, role: user.role }, jwtSecret, { expiresIn: '7d' });

        res.json({
            success: true,
            message: 'Login successful!',
            token,
            role: user.role
        });
    } catch (error) {
        console.error('Error during login:', error.message);
        res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
    }
});

//find user
app.get("/api/find-user", verifytoken, async (req, res) => {
    try {
        const data = await Log.findById(req.id).select("-password");      
        res.send(data)
    } catch (error) {
        console.log(error);

    }
})

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
