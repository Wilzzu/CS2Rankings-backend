const asyncHandler = require("express-async-handler");
const axios = require("axios");
const fs = require("fs");
const settings = require("../settings.json");
const dataValues = require("../database/dataValues.json"); // Data version and last update
const { v4: uuidv4 } = require("uuid");
const CronJob = require("cron").CronJob;
require("dotenv").config();
const CryptoJS = require("crypto-js");
const History = require("../database/models/history");
const { proto } = require("../utils/proto");

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

const readOldSeasons = (res, season, region) => {
	fs.readFile(`./database/oldSeasons/${season}/${region}.json`, "utf8", (err, data) => {
		if (err) {
			return res.status(404).json(`ERROR: failed to read data for "${season}" season!`);
		}
		const encryptData = CryptoJS.AES.encrypt(
			JSON.stringify(JSON.parse(data)),
			process.env.ENCRYPT
		).toString();
		res.status(200).json(encryptData);
	});
};

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
	});
};

const updatePlayerPosition = (player, oldPlayer) => {
	// If rank up
	// && (player.rank <= 11 || player.score > oldPlayer.score) score changed or top 11
	if (player.rank < oldPlayer.rank) {
		player.position = "up";
		player.lastUpdate = Date.now();
	}
	// If rank down
	// && (player.rank <= 11 || player.score < oldPlayer.score) score changed or top 11
	else if (player.rank > oldPlayer.rank) {
		player.position = "down";
		player.lastUpdate = Date.now();
	}
	// If player hasn't moved in 4 hours (14400000ms), set position to "unchanged"
	else if (oldPlayer.position !== "unchanged" && oldPlayer.lastUpdate + 14400000 <= Date.now()) {
		player.position = "unchanged";
	}
	// Else just keep the same position and date
	else {
		player.position = oldPlayer.position;
		player.lastUpdate = oldPlayer.lastUpdate;
	}
};

const calculateTier = (score) => {
	if (score >= 5000 && score < 10000) return 1;
	if (score >= 10000 && score < 15000) return 2;
	if (score >= 15000 && score < 20000) return 3;
	if (score >= 20000 && score < 25000) return 4;
	if (score >= 25000 && score < 30000) return 5;
	if (score >= 30000) return 6;
	else return 0;
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
	const oldData = cache[region];

	// Create new leaderboard object
	const leaderboard = {
		updateTime: Date.now(),
		region,
		players: [],
	};

	// Create new player objects and push them to leaderboard
	for (const player of data) {
		// Keep adding missing players until player is at correct position
		while (player?.rank > leaderboard.players.length + 1) {
			const missingPlayer = {
				id: uuidv4(),
				name: "Unknown player",
				rank: leaderboard.players.length + 1,
				score: "?????",
				tier: 0,
				position: "unchanged",
				lastUpdate: Date.now(),
				missing: true,
				detailData: {},
			};
			leaderboard.players.push(missingPlayer);
		}

		// Create new player object
		let score = JSON.parse(BigInt(player?.score) >> 15n);
		const playerObj = {
			id: uuidv4(),
			name: player?.name,
			rank: player?.rank,
			score,
			formattedScore: thousandSeparator(score),
			tier: calculateTier(score),
			position: "unchanged",
			lastUpdate: Date.now(),
			missing: false,
			detailData: await proto(player?.detailData),
		};

		// Update player's position
		if (oldData && oldData?.players && oldData?.players?.length >= 0) {
			const oldPlayer = oldData?.players.find((oldPlayer) => oldPlayer.name === player?.name);
			if (oldPlayer) updatePlayerPosition(playerObj, oldPlayer);
		}
		leaderboard.players.push(playerObj);
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

	// console.log("new data: " + region + " " + lbData?.data);
	// Update regions data value
	dataValues[region] = lbData?.data;
	updateFile("dataValues", dataValues);

	if (lbData?.entries.length <= 1) return;
	// Create new lb object and write it to a file and cache
	const newData = await createNewLbObject(lbData?.entries, region);
	updateFile(region, newData);
	cache[region] = newData;
};

// @desc    Get region leaderboard
// @route   GET /api/leaderboard/:season/:region
const getLeaderboard = asyncHandler(async (req, res) => {
	// Check for valid region
	let region = req.params.region;
	if (!settings.regions.includes(region))
		return res.status(400).json(`ERROR: "${region}" is not a valid region!`);
	let season = req.params.season;
	if (!settings.seasons.includes(season))
		return res.status(400).json(`ERROR: "${season}" is not a valid season!`);

	if (!cache[region]) return res.status(404).json(`ERROR: "${region}" has no data!`);

	// Return cache or old season data
	if (season !== settings.currentSeason) {
		readOldSeasons(res, season, region);
	} else {
		const encryptData = CryptoJS.AES.encrypt(
			JSON.stringify(cache[region]),
			process.env.ENCRYPT
		).toString();
		res.status(200).json(encryptData);
	}
});

// Update player history
const updateHistory = async (players) => {
	try {
		const bulkUpdateOperations = players.map((player) => ({
			updateOne: {
				filter: { name: player.name },
				update: { $push: { history: player.history } },
				upsert: true,
			},
		}));

		await History.bulkWrite(bulkUpdateOperations);
		console.log(`Updated history for all players @ ${new Date().toUTCString()}`);
	} catch (error) {
		console.error(`Error updating players: ${error.message}`);
	}
};

// Start script
const start = async () => {
	for (const region of settings.regions) {
		await mainFetch(region, true);
	}

	if (settings.dev) console.log(`!!! Dev mode is on !!!`);

	// Leaderboard updating
	setInterval(async () => {
		for (const region of settings.regions) {
			await mainFetch(region);
		}
	}, fetchInterval);

	// History updating 59 23 * * *
	const job = new CronJob(
		"59 23 * * *",
		function () {
			if (settings.dev) return;
			const playerHistoryData = [];

			const date = new Date().toISOString();
			cache.world.players.forEach((player) => {
				if (player.missing) return;
				if (playerHistoryData.some((e) => e.name === encodeURIComponent(player.name))) return; // Ignore duplicates

				// Create new player history object
				const playerObj = {
					name: encodeURIComponent(player.name),
					history: [
						{
							date,
							rank: player.rank,
							score: player.score,
						},
					],
				};

				// Only add match history if player has detailedData
				if (Object.keys(player.detailData))
					playerObj.history[0].matches =
						player.detailData.wins + player.detailData.ties + player.detailData.losses;
				playerHistoryData.push(playerObj);
			});
			updateHistory(playerHistoryData);
		},
		null,
		true,
		"UTC"
	);
};

start();

module.exports = { getLeaderboard };
