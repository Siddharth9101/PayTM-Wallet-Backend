const { Router } = require("express");
const { authMiddleware } = require("../middleware.js");
const { Account } = require("../db.js");
const mongoose = require("mongoose");

const router = Router();

router.get("/balance", authMiddleware, async (req, res) => {
  const userId = req.userId;

  try {
    const accountInfo = await Account.findOne({ userId: userId });
    return res.status(200).json({ balance: accountInfo.balance });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Unable to connect to the db" });
  }
});

router.post("/transfer", authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { to, amount } = req.body;

    const senderAcc = await Account.findOne({ userId: req.userId }).session(
      session
    );

    if (!senderAcc || senderAcc.balance < amount || amount < 0) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Insufficient balance",
      });
    }

    const recevierAcc = await Account.findOne({ userId: to }).session(session);

    if (!recevierAcc) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Invalid account",
      });
    }

    await Account.updateOne(
      { userId: req.userId },
      { $inc: { balance: -amount } }
    ).session(session);
    await Account.updateOne(
      { userId: to },
      { $inc: { balance: amount } }
    ).session(session);

    await session.commitTransaction();
    res.status(200).json({
      message: "Transfer successful",
    });
  } catch (error) {
    console.log(error);
    await session.abortTransaction();
    return res.status(500).json({ message: "Unable to complete transfer" });
  } finally {
    session.endSession();
  }
});

module.exports = router;
