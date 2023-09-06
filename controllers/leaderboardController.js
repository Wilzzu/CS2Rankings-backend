const asyncHandler = require("express-async-handler");
const axios = require("axios");
const fs = require("fs");
const settings = require("../settings.json");
const dataValues = require("../database/dataValues.json");

// Valid regions
const regions = [
	"africa",
	"asia",
	"australia",
	"china",
	"europe",
	"northamerica",
	"southamerica",
	"world",
];

// Fetch limit
let lastFetch = 0;
const fetchInterval = 10000;

const fetchData = async (region) => {
	let url = `${settings.leaderboardurl}${region !== "world" ? `_${region}` : ""}`;
	return axios
		.get(url)
		.then((response) => {
			return response.data;
		})
		.catch((err) => {
			console.log(err);
			return 404;
		});
};

const returnOldData = (res, region) => {
	console.log("old data");
	fs.readFile(`./database/${region}.json`, "utf8", (err, oldData) => {
		if (err) {
			console.log(err);
			return res.status(404);
		}
		return res.status(200).json(JSON.parse(oldData));
	});
};

// @desc    Get region leaderboard
// @route   GET /api/leaderboard/:region
const getLeaderboard = asyncHandler(async (req, res) => {
	// Check for valid region
	let region = req.params.region;
	if (!regions.includes(region))
		return res.status(400).json(`ERROR: ${region} is not a valid region!`);

	// If fetching too often serve old data
	if (lastFetch + fetchInterval >= Date.now()) return returnOldData(res, region);
	lastFetch = Date.now(); // Update last fetch value and continue fetching

	let data = await fetchData(region);
	console.log("new: " + data.result.data + " old: " + dataValues[region]);
	// Old data
	if (data.result.data === dataValues[region]) return returnOldData(res, region);
	console.log("new data");
	// Update dataValues
	// Add correct position, but keep the raw position as well
	// Check if player has risen or fallen and how much
	// New players dont get an arrow cause they can just change name
});

module.exports = { getLeaderboard };
