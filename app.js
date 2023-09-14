const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const History = require("./database/models/history");

const { getLeaderboard } = require("./controllers/leaderboardController");

const port = process.env.PORT || 3000;
const app = express();

const dbURL = `mongodb+srv://wilzzu:${process.env.MONGOPASS}@rankings.7vlhij2.mongodb.net/playerdata?retryWrites=true&w=majority`;
mongoose
	.connect(dbURL)
	.then((res) => console.log("Connected to database!"))
	.catch((err) => console.log(err));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/api/leaderboard/:season/:region", getLeaderboard);
app.get("/api/history/:name", (req, res) => {
	History.findOne({ name: encodeURIComponent(req.params.name) })
		.then((docs) => res.status(200).json(docs))
		.catch((err) => console.log(err));
});

app.listen(port, () => console.log(`Server started on port ${port}`));
