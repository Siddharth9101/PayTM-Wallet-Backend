const express = require("express");
const { signupSchema, updateSchema } = require("../types.js");
const { User } = require("../db.js");
const { Account } = require("../db.js");
const jwt = require("jsonwebtoken");
const { authMiddleware } = require("../middleware.js");

const router = express.Router();

router.post("/signup", async (req, res) => {
  const userInfo = req.body;

  const { success } = signupSchema.safeParse(userInfo);

  if (!success) {
    return res.status(411).json({
      message: "Email already taken / Incorrect inputs",
    });
  }

  try {
    var userDoc = await User.findOne({ username: userInfo.username });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error while connecting to db" });
  }

  if (userDoc) {
    return res.status(411).json({
      message: "Email already taken / Incorrect inputs",
    });
  }

  const newUser = new User({
    username: userInfo.username,
    firstname: userInfo.firstname,
    lastname: userInfo.lastname,
  });

  const hashPassword = await newUser.createHash(userInfo.password);
  newUser.password = hashPassword;

  try {
    var createdUser = await newUser.save();
    await Account.create({
      userId: createdUser._id,
      balance: 1 + Math.random() * 10000,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error while connecting to db" });
  }

  try {
    const token = jwt.sign({ userId: createdUser._id }, process.env.JWT_SECRET);
    return res.status(201).json({
      message: "User created successfully",
      token: token,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error while signing up" });
  }
});

router.post("/signin", async (req, res) => {
  const userInfo = req.body;
  try {
    var userDoc = await User.findOne({ username: userInfo.username });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error while connecting to db" });
  }

  if (!userDoc) {
    return res.status(411).json({
      message: "Incorrect username",
    });
  }

  const validatePassword = await userDoc.validatePassword(userInfo.password);

  if (!validatePassword) {
    return res.status(411).json({
      message: "Incorrect Password",
    });
  }

  try {
    const token = jwt.sign({ userId: userDoc._id }, process.env.JWT_SECRET);
    return res.status(200).json({
      message: "Signed in",
      token: token,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error while logging in" });
  }
});

router.put("/", authMiddleware, async (req, res) => {
  const userInfo = req.body;
  const userId = req.userId;

  const { success } = updateSchema.safeParse(userInfo);

  if (!success) {
    return res.status(411).json({
      message: "Error while updating information",
    });
  }

  try {
    await User.updateOne({ _id: userId }, userInfo);
    res.status(200).json({
      message: "Updated successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error while connecting to the db" });
  }
});

router.get("/bulk", async (req, res) => {
  const filter = req.query.filter || "";

  try {
    const filteredUsers = await User.find({
      $or: [
        { firstname: { $regex: filter } },
        { lastname: { $regex: filter } },
      ],
    });

    res.status(200).json({
      users: filteredUsers.map((user) => ({
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        id: user._id,
      })),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error while connecting to the db" });
  }
});

router.get("/me", async (req, res) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  try {
    var decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error while authorizing" });
  }

  try {
    const userDoc = await User.findOne({ _id: decoded.userId });
    return res.status(200).json({
      user: {
        username: userDoc.username,
        firstname: userDoc.firstname,
        lastname: userDoc.lastname,
        id: userDoc._id,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error while fetching user details" });
  }
});

module.exports = router;
