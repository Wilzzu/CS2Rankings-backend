const History = require("../database/models/history");
const mongoose = require("mongoose");
require("dotenv").config();

const dbURL = `mongodb+srv://wilzzu:${process.env.MONGOPASS}@rankings.7vlhij2.mongodb.net/playerdata?retryWrites=true&w=majority`;
mongoose
	.connect(dbURL)
	.then((res) => removeHistory())
	.catch((err) => console.log(err));

// $lt to delete everything BEFORE a date, $gt to delete everything AFTER a date
const removeHistory = async () => {
	try {
		const dateThreshold = new Date("2023-10-03T23:59:00.006+00:00");

		const result = await History.updateMany(
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
