const asyncHandler = require("express-async-handler");
const axios = require("axios");
const settings = require("../settings.json");

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

// @desc    Get region leaderboard
// @route   GET /api/leaderboard/:region
const getLeaderboard = asyncHandler(async (req, res) => {
	let region = req.params.region;
	let data = await fetchData(region);
	console.log(data);
	// Add correct position, but keep the raw position as well
	// Check if player has risen or fallen and how much
	// New players dont get an arrow cause they can just change name
	// Add to db if new data id
});

module.exports = { getLeaderboard };
