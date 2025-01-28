const getHistoryModel = require("../database/models/history");
const mongoose = require("mongoose");
const settings = require("../settings.json");
require("dotenv").config();

const dbURL = `${process.env.MONGODB_URI}playerdata?retryWrites=true&w=majority`;
mongoose
	.connect(dbURL)
	.then((res) => removeHistory())
	.catch((err) => console.log(err));

// $lt to delete everything BEFORE a date, $gt to delete everything AFTER a date
const removeHistory = async () => {
	try {
		const dateThreshold = new Date(settings.historyDateThreshold);

		const result = await getHistoryModel("seasonName").updateMany(
			{
				"history.date": { $lt: dateThreshold },
			},
			{
				$pull: {
					history: {
						date: { $lt: dateThreshold },
					},
				},
			}
		);
		console.log(
			`Matched ${result.matchedCount} document(s) and modified ${result.modifiedCount} document(s).`
		);
	} catch (error) {
		console.error(error);
	}
};
