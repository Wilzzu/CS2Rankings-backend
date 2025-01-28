const expressAsyncHandler = require("express-async-handler");
const getHistoryModel = require("../database/models/history");
require("dotenv").config();
const CronJob = require("cron").CronJob;

let caches = {};

// Get the cache for a specific season
function getSeasonCache(seasonName) {
	if (!caches[seasonName]) {
		caches[seasonName] = new Map();
	}
	return caches[seasonName];
}

const getHistory = expressAsyncHandler(async (req, res) => {
	const { name, season } = req.params;
	const encodedName = encodeURIComponent(name);

	// Get the cache for the season
	const cache = getSeasonCache(season);

	// Check if the data is cached for the player in the season
	if (cache.has(encodedName)) return res.status(200).json(cache.get(encodedName));

	// If not cached, fetch from MongoDB
	try {
		const playerData = await getHistoryModel(season).findOne({ name: encodedName });
		if (playerData) {
			// Cache the data
			cache.set(encodedName, playerData);
			console.log(`Caching data for ${name} in ${season}`);

			let seasonCacheSize = 0;
			for (let value of cache.values()) seasonCacheSize += value.name.length + value.history.length;
			console.log(`${season} cache size: ${seasonCacheSize} bytes`);

			// Clear season's cache if it's over 10MB
			if (seasonCacheSize > 10_000_000) {
				console.log(`Clearing cache for ${season}`);
				cache.clear();
			}

			return res.status(200).json(playerData);
		} else return res.status(200).json(null);
	} catch (err) {
		console.error(err);
		return res.status(500).json({ message: "Error fetching player data" });
	}
});

// Clear cache every day after new history data should be available
const job = new CronJob(
	"0 0 * * *",
	function () {
		console.log("Cleared history cache");
		caches = {};
	},
	null,
	true,
	"UTC"
);

module.exports = { getHistory };
