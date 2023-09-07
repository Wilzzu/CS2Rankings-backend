const asyncHandler = require("express-async-handler");
const axios = require("axios");
const fs = require("fs");
const settings = require("../settings.json");
const dataValues = require("../database/dataValues.json"); // Data version and last update

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
const fetchInterval = 30000;

const fetchData = async (region) => {
	let url = `${settings.leaderboardurl}${region !== "world" ? `_${region}` : ""}`;
	return axios
		.get(url)
		.then((response) => {
			if (response.data?.result) return response.data.result;
			return null;
		})
		.catch((err) => {
			console.log(err);
			return null;
		});
};

const returnOldData = (res, region, updateLastUpdate) => {
	// Update lastUpdate if we fetched before making this function call
	// TODO: Remove these console logs from if/else
	if (updateLastUpdate) {
		console.log("old data");
		dataValues[region].lastUpdate = Date.now();
		updateFile("dataValues", dataValues);
	} else console.log("too often");

	// Return old data
	fs.readFile(`./database/${region}.json`, "utf8", (err, oldData) => {
		if (err) {
			console.log(err);
			return res.status(404);
		}
		return res.status(200).json(JSON.parse(oldData));
	});
};

const updateFile = (file, data) => {
	fs.writeFileSync(`./database/${file}.json`, JSON.stringify(data, null, 4), (err) => {
		if (err) console.log(err);
		console.log("updated file");
	});
};

const updatePlayerPosition = (player, oldPlayer) => {
	if (player.rank < oldPlayer.rank) {
		player.position = "up";
		player.lastUpdate = Date.now();
	} else if (player.rank > oldPlayer.rank) {
		player.position = "down";
		player.lastUpdate = Date.now();
	}
	// If player hasn't moved in 12 hours (43200000), set position to "unchanged"
	else if (player.position !== "unchanged" && player.lastUpdate + 43200000 <= Date.now()) {
		player.position = "unchanged";
	} else {
		player.position = oldPlayer.position;
		player.lastUpdate = oldPlayer.lastUpdate;
	}
};

const calculateColor = (score) => {
	if (score >= 5000 && score < 10000) return "#8cc6ff";
	if (score >= 10000 && score < 15000) return "#6a7dff";
	if (score >= 15000 && score < 20000) return "#c166ff";
	if (score >= 20000 && score < 25000) return "#f03cff";
	if (score >= 25000 && score < 30000) return "#eb4b4b";
	if (score >= 30000) return "#ffd700";
	else return "#b0c3d9";
};

const createNewLbObject = async (data, region) => {
	// Read old data for setting players position
	const oldData = JSON.parse(
		fs.readFileSync(`./database/${region}.json`, "utf8", (err, data) => {
			if (err) {
				console.log(err);
				return null;
			}
			return data;
		})
	);

	// Create new leaderboard object
	const leaderboard = {
		updateTime: Date.now(),
		region,
		players: [],
	};

	// Create new player objects and push them to leaderboard
	for (i = 0; i < data.length; i++) {
		if (data[i].rank > leaderboard.players.length + 1) {
			const missingPlayer = {
				name: "unknown",
				rank: leaderboard.players.length + 1,
				score: "?????",
				color: "#8cc6ff",
				position: "unchanged",
				lastUpdate: Date.now(),
				missing: true,
			};
			leaderboard.players.push(missingPlayer);
			i--;
		} else {
			let score = JSON.parse(BigInt(data[i]?.score) >> 15n);
			const player = {
				name: data[i]?.name,
				rank: data[i]?.rank,
				score,
				color: calculateColor(score),
				position: "unchanged",
				lastUpdate: Date.now(),
				missing: false,
			};

			// Update player's position
			if (oldData && oldData?.players && oldData?.players?.length >= 0) {
				const oldPlayer = oldData?.players.find((oldPlayer) => oldPlayer.name === e.name);
				if (oldPlayer) updatePlayerPosition(player, oldPlayer);
			}
			leaderboard.players.push(player);
		}
	}
	return leaderboard;
};

// @desc    Get region leaderboard
// @route   GET /api/leaderboard/:region
const getLeaderboard = asyncHandler(async (req, res) => {
	// Check for valid region
	let region = req.params.region;
	if (!regions.includes(region))
		return res.status(400).json(`ERROR: "${region}" is not a valid region!`);

	// If fetching too often serve old data
	if (dataValues[region].lastUpdate + fetchInterval >= Date.now()) {
		return returnOldData(res, region);
	}

	// Fetch new data
	let lbData = await fetchData(region);
	if (!lbData) return res.status(404);

	// If same data, serve old data, else update old json with new data
	if (lbData?.data === dataValues[region].value) return returnOldData(res, region, true);
	if (!lbData?.entries) return returnOldData(res, region, true);
	console.log("new data");

	// Update regions value and lastUpdate
	dataValues[region].value = lbData?.data;
	dataValues[region].lastUpdate = Date.now();
	updateFile("dataValues", dataValues);

	// Create new leaderboard object
	const newData = await createNewLbObject(lbData?.entries, region);
	updateFile(region, newData);

	if (newData) return res.status(200).json(newData);
	else returnOldData(res, region, true);
});

module.exports = { getLeaderboard };
