const expressAsyncHandler = require("express-async-handler");
const History = require("../database/models/history");
const CryptoJS = require("crypto-js");
require("dotenv").config();
const CronJob = require("cron").CronJob;

let cache = [];

const getHistory = expressAsyncHandler(async (req, res) => {
	const name = encodeURIComponent(req.params.name);

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
