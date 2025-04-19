const express = require("express");
const mongoose = require("mongoose");
const moment = require("moment");
const book = express.Router()

// User Schema
const UserSchema = new mongoose.Schema({
    customerId: String,
    customerPhone: Number,
    date: { type: Date, default: Date.now },
    customerFunction: String,
    otherFunction: String,
    noOfDays: Number,
    customerRent: Number,
    customerName: String,
    customerAddress: String,
    functionDate: Date,
    customerAdvance: Number,
    fromDate1: Date,
    timeSlot1: String,
    fromDate2: Date,
    timeSlot2: String,
},{timestamps:true});

const User = mongoose.model("User", UserSchema);

book.get('/booking', async (req, res) => {
    try {
        const users = await User.find().sort({ _id: 1 });
        res.json(users)
    } catch (err) {
        res.status(500).json({ message: 'Error:', error: err })
    }
})

book.post('/booking', async (req, res) => {
    const {customerPhone, customerFunction, otherFunction, noOfDays, customerRent, customerName, customerAddress, functionDate, customerAdvance, fromDate1, timeSlot1, fromDate2, timeSlot2 } = req.body

    try {
        const userCount = await User.countDocuments();
        const customerId = `NSA${1001 + userCount}`; 
         const idPattern = /^NSA\d{4}$/;
        if (!idPattern.test(customerId)) {
            return res.status(400).json({ success: false, message: 'Invalid customer ID format.' });
        }
        const newUser = new User({ customerId, customerPhone, customerFunction, otherFunction, noOfDays, customerRent, customerName, customerAddress, functionDate, customerAdvance, fromDate1, timeSlot1, fromDate2, timeSlot2 });
        await newUser.save();
        res.status(201).json({ message: "UserCreate", book: newUser })
    } catch (err) {
        res.status(500).json({ message: 'Error:', error: err })
    }
})

book.put('/booking/:customerId', async (req, res) => {
    const { customerId } = req.params;
    const {
        customerPhone,
        customerFunction,
        otherFunction,
        noOfDays,
        customerRent,
        customerName,
        customerAddress,
        functionDate,
        customerAdvance,
        fromDate1,
        timeSlot1,
        fromDate2,
        timeSlot2,
    } = req.body;

    try {
        const updateUser = await User.findOneAndUpdate(
            { customerId }, 
            { $set: req.body },
            { new: true, runValidators: true }
        );

        if (!updateUser) {
            return res.status(400).json({ message: "User Not Found" });
        }

        res.json({ message: "User Updated Successfully!", book: updateUser });
    } catch (error) {
        res.status(500).json({ message: 'Error updating user', error });
    }
});

// Get customer Name from entering customerId stores while billing
book.get('/booking/:customerId', async (req, res) => {
    const { customerId } = req.params;

    try {
        const customer = await User.findOne({ customerId });
        if (customer) {
            res.json(customer);
        } else {
            res.status(404).json({ message: 'Customer not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error fetching customer' });
    }
});

book.get("/calender", async (req, res) => {
    try {
        const bookings = await User.find({}, {
            customerId: 1,
            customerName: 1,
            fromDate1: 1,
            timeSlot1: 1,
            fromDate2: 1,
            timeSlot2: 1,
            _id: 0,
        });
        res.status(200).json(bookings);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

book.get("/barChart", async (req, res) => {
    try {
        const bookings = await User.find({}, {
            fromDate1: 1,
            _id: 0,
        });

        const monthCounts = Array(12).fill(0);

        // Process each booking
        bookings.forEach((booking) => {
            if (booking.fromDate1) {
                const month1 = moment(booking.fromDate1).month();
                monthCounts[month1]++;
            }
        });

        const allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",];

        // Map month data to bar chart format
        const barChartData = allMonths.map((month, index) => ({
            month,
            occupancy: monthCounts[index],
        }));
        res.status(200).json(barChartData);
    } catch (error) {
        res.status(500).json({ message: "Error fetching bar chart data", error });
    }
});

book.get('/report', async (req, res) => {
    try {
        const bookReport = await User.find().select('customerId customerName customerRent customerAdvance date');

        res.json(bookReport);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching reports', error: err });
    }
});



module.exports = book;
