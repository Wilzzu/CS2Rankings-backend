const getHistoryModel = require("../database/models/history");
const mongoose = require("mongoose");
require("dotenv").config();

const dbURL = `${process.env.MONGODB_URI}playerdata?retryWrites=true&w=majority`;
mongoose
	.connect(dbURL)
	.then((res) => removePlayers())
	.catch((err) => console.log(err));

const removePlayers = async () => {
	let removedAmount = 0;
	try {
		const History = getHistoryModel("seasonName");
		const playersToRemove = await History.find({ history: { $size: 0 } });
		console.log("Removing players, please wait...");
		for (const player of playersToRemove) {
			await History.deleteOne({ _id: player._id });
			removedAmount++;
		}
	} catch (error) {
		console.error(error);
	}
	console.log("Removed " + removedAmount + " players!");
};
