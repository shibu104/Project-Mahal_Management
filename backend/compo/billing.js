const express = require('express')
const mongoose = require('mongoose')
const bill = express.Router();

const BillSchema = new mongoose.Schema({
    customerId: String,
    customerName: String,
    date: { type: Date, default: Date.now },
    startRead1: {
        read1: { type: Number },
        read2: { type: Number },
        read3: { type: Number },
    },
    endRead1: {
        read1: { type: Number },
        read2: { type: Number },
        read3: { type: Number },
    },
    total: Number,
    rate: Number,
    readAmount: Number,
    functionRent: Number,
    charges: {
        roomRent: Number,
        cleaningCharge: Number,
        brokenCharge: Number,
        fuelCharge: Number,
        waterCharge: Number,
        generatorRent: Number,
    },
    point: {
        startPoint: { type: Number },
        endPoint: { type: Number },
        totalPoint: { type: Number },
    },
    extraCharge: Number,
    discount: Number,
    totalFunctionAmount: Number,
},{timestamps:true})
const Bill = mongoose.model('Bill', BillSchema)

bill.get('/billing', async (req, res) => {
    try {
        const getBill = await Bill.find();
        res.json(getBill);
    } catch (err) {
        res.status(500).json({ message: 'error:', error: err })
    }
})

bill.post('/billing', async (req, res) => {
    const { customerName, startRead1, endRead1, total, rate, readAmount, functionRent, charges, point, extraCharge, discount, totalFunctionAmount,date } = req.body;

    try {
        const userCount = await Bill.countDocuments();
        const customerId = `NSA${1001 + userCount}`; 

        const idPattern = /^NSA\d{4}$/;
        if (!idPattern.test(customerId)) {
            return res.status(400).json({ success: false, message: 'Invalid customer ID format.' });
        }

        const postBill = new Bill({ customerId, customerName, startRead1, endRead1, total, rate, readAmount, functionRent, charges, point, extraCharge, discount, totalFunctionAmount, date});

        await postBill.save();
        res.status(201).json({ message: 'Bill saved successfully!', bill: postBill });
    } catch (err) {
        console.error('Error while saving bill:', err);
        res.status(500).json({ message: 'Error while saving bill', error: err });
    }
});

// BillUpdate using customer
bill.get('/billing/:customerId', async (req, res) => {
    const customerId = req.params.customerId;

    try {
        const billDetails = await Bill.findOne({ customerId });
        if (!billDetails) {
            return res.status(404).json({ message: 'Bill not found!' });
        }
        res.json(billDetails);
    } catch (err) {
        res.status(500).json({ message: 'Error:', error: err });
    }
});

bill.put('/billing/:customerId', async (req, res) => {
    const customerId = req.params.customerId;

    try {
        const updatedBill = await Bill.findOneAndUpdate(
            { customerId }, 
            { $set: req.body },
            { new: true }
        );

        if (!updatedBill) {
            return res.status(404).json({ message: 'Bill not found!' });
        }

        res.json({ message: 'Bill updated successfully', bill: updatedBill });
    } catch (err) {
        console.error('Error while updating bill:', err);
        res.status(500).json({ message: 'Error while updating bill', error: err });
    }
});

// charges take for dashboard
bill.get('/charge', async (req, res) => {
    try {
        const getCharge = await Bill.find({}, {
            charges: 1,
            extraCharge: 1,
            _id: 0
        });

        let totalCharges = {
            roomRent: 0,
            cleaningCharge: 0,
            brokenCharge: 0,
            fuelCharge: 0,
            waterCharge: 0,
            generatorRent: 0,
            extraCharge: 0,
        };

        getCharge.forEach((entry) => {
            const { charges, extraCharge } = entry;

            totalCharges.roomRent += charges.roomRent || 0;
            totalCharges.cleaningCharge += charges.cleaningCharge || 0;
            totalCharges.brokenCharge += charges.brokenCharge || 0;
            totalCharges.fuelCharge += charges.fuelCharge || 0;
            totalCharges.waterCharge += charges.waterCharge || 0;
            totalCharges.generatorRent += charges.generatorRent || 0;
            totalCharges.extraCharge += extraCharge || 0;
        });

        res.status(200).json(totalCharges);
    } catch (err) {
        res.status(500).json({ message: 'error:', error: err })
    }
})


module.exports = bill