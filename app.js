const express = require("express");
var cors = require("cors");

const { getLeaderboard } = require("./controllers/leaderboardController");

const port = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/api/leaderboard/:season/:region", getLeaderboard);

app.listen(port, () => console.log(`Server started on port ${port}`));
