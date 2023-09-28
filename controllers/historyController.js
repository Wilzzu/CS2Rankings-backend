const expressAsyncHandler = require("express-async-handler");
const History = require("../database/models/history");
const CryptoJS = require("crypto-js");
require("dotenv").config();
const CronJob = require("cron").CronJob;
const settings = require("../settings.json");
const fs = require("fs");

let cache = [];

const getHistory = expressAsyncHandler(async (req, res) => {
	const name = encodeURIComponent(req.params.name);

	// Read old season player history from a file
	if (settings.currentSeason !== req.params.season) {
		console.log("Fetch old history for " + name);
		fs.readFile(
			`./database/oldSeasons/${req.params.season}/playerdata.json`,
			"utf8",
			(err, data) => {
				if (err) {
					return res
						.status(404)
						.json(
							`ERROR: failed to read history data for "${req.params.season}" season player "${name}" !`
						);
				}
				let newData = null;
				// Find player from file and change date to correct format
				const findPlayer = JSON.parse(data).find((e) => e.name === name);
				if (findPlayer) {
					findPlayer.history.forEach((e) => {
						e.date = e.date["$date"];
					});
					newData = findPlayer;
				}
				// Encrypt and return
				const encryptData = CryptoJS.AES.encrypt(
					JSON.stringify(newData),
					process.env.ENCRYPT
				).toString();
				return res.status(200).json(encryptData);
			}
		);
	}
	// Find player from MongoDB
	else {
		// Return from cache if player is already searched for
		const findPlayer = cache.find((e) => e.name === name);
		if (findPlayer) return res.status(200).json(findPlayer.data);
		console.log("Fetch new history for " + name);

		// Search player from database
		History.findOne({ name })
			.then((docs) => {
				const encryptData = CryptoJS.AES.encrypt(
					JSON.stringify(docs),
					process.env.ENCRYPT
				).toString();
				cache.push({ name, data: encryptData });
				return res.status(200).json(encryptData);
			})
			.catch((err) => console.log(err));
	}
});

const job = new CronJob(
	"0 0 * * *",
	function () {
		console.log("Clear history cache");
		cache = [];
	},
	null,
	true,
	"UTC"
);

module.exports = { getHistory };
