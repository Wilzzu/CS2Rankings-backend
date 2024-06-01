const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const { getLeaderboard } = require("./controllers/leaderboardController");
const { getHistory } = require("./controllers/historyController");

const port = process.env.PORT || 3000;
const app = express();

const dbURL = `${process.env.MONGODB_URI}playerdata?retryWrites=true&w=majority`;
mongoose
	.connect(dbURL)
	.then(() => console.log("Connected to database!"))
	.catch((err) => console.log(err));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/api/leaderboard/:season/:region", getLeaderboard);
app.get("/api/history/:season/:name", getHistory);

app.listen(port, () => console.log(`Server started on port ${port}`));
