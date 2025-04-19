const express = require("express");
const mongoose = require("mongoose");
const { all } = require("./booking");
const exp = express.Router();

// Table Schema
const TableSchema = new mongoose.Schema({
    manualEntry: String,
    expense: Number,
    income: Number
})
// Expense Schema
const ExpenseSchema = new mongoose.Schema({
    date: Date,
    openingBalance: Number,
    handCash: Number,
    totalIncome: Number,
    totalExpense: Number,
    endDateBalance: Number,
    transactions: [TableSchema],
});

const Expense = mongoose.model("Expense", ExpenseSchema);

exp.get('/expense', async (req, res) => {
    try {
        const expenses = await Expense.find();
        res.json(expenses);
    } catch (err) {
        res.status(500).json({ message: 'Error:', error: err });
    }
});

// 📌 This goes ABOVE the /expense route
function getLocalDateOnly(dateString) {
  const date = new Date(dateString);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs);
}

async function updateFutureBalances(fromDate) { 
  let prevEntry = await Expense.findOne({ date: fromDate });

  if (!prevEntry) return;

  let nextDate = new Date(fromDate);
  nextDate.setDate(nextDate.getDate() + 1);
  nextDate.setHours(0, 0, 0, 0);

  while (true) {
    const nextEntry = await Expense.findOne({ date: nextDate });

    if (!nextEntry) break;

    nextEntry.openingBalance = prevEntry.endDateBalance;
    nextEntry.endDateBalance =
      nextEntry.openingBalance + nextEntry.handCash + nextEntry.totalIncome - nextEntry.totalExpense;

    await nextEntry.save();

    prevEntry = nextEntry;
    nextDate.setDate(nextDate.getDate() + 1);
  }
}

// Main expense POST route
exp.post('/expense', async (req, res) => {
  const {
    date,
    handCash = 0,
    transactions = []
  } = req.body;

  const localDate = getLocalDateOnly(date); // ✅ Convert to local date
  localDate.setHours(0, 0, 0, 0);

  const startOfDay = new Date(localDate);
  const endOfDay = new Date(localDate);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    const incomeEntries = transactions
      .filter(txn => txn.manualEntry && Number(txn.income) > 0)
      .map(txn => ({
        manualEntry: txn.manualEntry,
        expense: 0,
        income: Number(txn.income),
      }));

    const expenseEntries = transactions
      .filter(txn => txn.manualEntry && Number(txn.expense) > 0)
      .map(txn => ({
        manualEntry: txn.manualEntry,
        income: 0,
        expense: Number(txn.expense),
      }));

    const combinedTransactions = [...incomeEntries, ...expenseEntries];

    let totalIncome = incomeEntries.reduce((sum, txn) => sum + txn.income, 0);
    let totalExpense = expenseEntries.reduce((sum, txn) => sum + txn.expense, 0);

    const existingEntry = await Expense.findOne({
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (existingEntry) {
      existingEntry.transactions.push(...combinedTransactions);
      existingEntry.totalIncome += totalIncome;
      existingEntry.totalExpense += totalExpense;

      existingEntry.endDateBalance =
        existingEntry.openingBalance + existingEntry.handCash + existingEntry.totalIncome - existingEntry.totalExpense;

      await existingEntry.save();
      await updateFutureBalances(existingEntry.date); 

      return res.status(200).json({
        message: "Existing day updated",
        allData: existingEntry
      });
    } else {
      const previousDay = await Expense.findOne({ date: { $lt: startOfDay } }).sort({ date: -1 });
      const openingBalance = previousDay?.endDateBalance || 0;

      const endDateBalance = openingBalance + handCash + totalIncome - totalExpense;

      const newExpense = new Expense({
        date: startOfDay, // ✅ Save startOfDay to Mongo
        openingBalance,
        handCash,
        totalIncome,
        totalExpense,
        endDateBalance,
        transactions: combinedTransactions
      });

      await newExpense.save();
      await updateFutureBalances(newExpense.date); 

      const nextDay = new Date(startOfDay);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(0, 0, 0, 0);

      const nextEntry = await Expense.findOne({ date: nextDay });

      if (nextEntry) {
        nextEntry.openingBalance = endDateBalance;
        nextEntry.endDateBalance =
          nextEntry.openingBalance + nextEntry.handCash + nextEntry.totalIncome - nextEntry.totalExpense;
        await nextEntry.save();
      }

      return res.status(201).json({
        message: "New day entry created",
        allData: newExpense
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});  




// income expense generate for dashboard page
exp.get("/dash", async (req, res) => {
  try {
    const totalData = await Expense.aggregate([
      {
        $group: {
          _id: null,
          totalIncome: { $sum: "$totalIncome" },
          totalExpense: { $sum: "$totalExpense" },
        },
      },
    ]);

    const weeklyExpenseData = await Expense.aggregate([
      {
        $project: {
          year: { $year: "$date" }, 
          month: { $month: "$date" }, 
          weekOfMonth: {
            $ceil: { $divide: [{ $dayOfMonth: "$date" }, 7] }, 
          },
          totalExpense: 1,
        },
      },
      {
        $group: {
          _id: { year: "$year", month: "$month", week: "$weekOfMonth" },
          weeklyExpense: { $sum: "$totalExpense" }, 
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.week": 1 }, 
      },
    ]);

    const totalIncome1 = totalData.length > 0 ? totalData[0].totalIncome || 0 : 0;
    const totalExpense1 = totalData.length > 0 ? totalData[0].totalExpense || 0 : 0;

    res.json({
      totalIncome1,
      totalExpense1,
      weeklyExpense: weeklyExpenseData.map((item) => ({
        year: item._id.year,
        month: item._id.month,
        week: item._id.week,
        amount: item.weeklyExpense,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching data", error });
  }
});


module.exports = exp;
