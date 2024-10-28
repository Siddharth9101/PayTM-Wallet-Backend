require("dotenv").config();
const express = require("express");
const rootRouter = require("./routes/index.js");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/v1", rootRouter);

app.use((err, req, res, next) => {
  console.log(err);
  res.status(500).json({ message: "Something went wrong" });
});

app.listen(3000, () => console.log("Server started"));
