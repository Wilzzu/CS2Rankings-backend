const asyncHandler = require("express-async-handler");
const axios = require("axios");
const fs = require("fs");
const settings = require("../settings.json");
const dataValues = require("../database/dataValues.json"); // Data version and last update
const { v4: uuidv4 } = require("uuid");

// Regions cache
const cache = {
	africa: {},
	asia: {},
	australia: {},
	china: {},
	europe: {},
	northamerica: {},
	southamerica: {},
	world: {},
};

const fetchInterval = 30000;

const fetchData = async (region) => {
	let url = `${settings.leaderboardurl}_${settings.currentSeason}${
		region !== "world" ? `_${region}` : ""
	}`;
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
	// If player hasn't moved in 6 hours (21600000), set position to "unchanged"
	else if (player.position !== "unchanged" && player.lastUpdate + 21600000 <= Date.now()) {
		player.position = "unchanged";
	} else {
		player.position = oldPlayer.position;
		player.lastUpdate = oldPlayer.lastUpdate;
	}
};

const calculateTier = (score) => {
	if (score >= 5000 && score < 10000) return "tier1";
	if (score >= 10000 && score < 15000) return "tier2";
	if (score >= 15000 && score < 20000) return "tier3";
	if (score >= 20000 && score < 25000) return "tier4";
	if (score >= 25000 && score < 30000) return "tier5";
	if (score >= 30000) return "tier6";
	else return "tier0";
};

function thousandSeparator(score) {
	let split = score
		.toString()
		.replace(/\B(?=(\d{3})+(?!\d))/g, "|")
		.split("|");
	if (split.length <= 1) return { big: split[0], small: "" };
	return { big: split[0], small: split[1] };
}

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
				id: uuidv4(),
				name: "Unknown player",
				rank: leaderboard.players.length + 1,
				score: "?????",
				tier: "tier0",
				position: "unchanged",
				lastUpdate: Date.now(),
				missing: true,
			};
			leaderboard.players.push(missingPlayer);
			i--;
		} else {
			let score = JSON.parse(BigInt(data[i]?.score) >> 15n);
			const player = {
				id: uuidv4(),
				name: data[i]?.name,
				rank: data[i]?.rank,
				score,
				formattedScore: thousandSeparator(score),
				tier: calculateTier(score),
				position: "unchanged",
				lastUpdate: Date.now(),
				missing: false,
			};

			// Update player's position
			if (oldData && oldData?.players && oldData?.players?.length >= 0) {
				const oldPlayer = oldData?.players.find((oldPlayer) => oldPlayer.name === data[i]?.name);
				if (oldPlayer) updatePlayerPosition(player, oldPlayer);
			}
			leaderboard.players.push(player);
		}
	}
	return leaderboard;
};

const mainFetch = async (region, force) => {
	let lbData = await fetchData(region);
	// Validate data
	if (!force) {
		if (!lbData) return;
		if (lbData?.data === dataValues[region]) return;
		if (!lbData?.entries) return;
	}

	console.log("new data: " + region + " " + lbData?.data);
	// Update regions data value
	dataValues[region] = lbData?.data;
	updateFile("dataValues", dataValues);

	// Create new lb object and write it to a file and cache
	const newData = await createNewLbObject(lbData?.entries, region);
	updateFile(region, newData);
	cache[region] = newData;
};

// @desc    Get region leaderboard
// @route   GET /api/leaderboard/:region
const getLeaderboard = asyncHandler(async (req, res) => {
	console.log("new request: " + req.params.region);
	// Check for valid region
	let region = req.params.region;
	if (!settings.regions.includes(region))
		return res.status(400).json(`ERROR: "${region}" is not a valid region!`);
	let season = req.params.season;
	if (!settings.seasons.includes(season))
		return res.status(400).json(`ERROR: "${season}" is not a valid season!`);

	if (!cache[region]) return res.status(404).json(`ERROR: "${region}" has no data!`);

	// Return cache or old season data
	if (season !== settings.currentSeason) console.log("Serve old season");
	else return res.status(200).json(cache[region]);
});

const start = async () => {
	for (const region of settings.regions) {
		await mainFetch(region, true);
	}

	setInterval(async () => {
		for (const region of settings.regions) {
			await mainFetch(region);
		}
	}, fetchInterval);
};

start();

module.exports = { getLeaderboard };
