const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const historySchema = new Schema(
	{
		name: {
			type: String,
			required: true,
		},
		history: [{ date: Date, rank: Number, score: Number, matches: Number }],
	},
	{ timestamps: true }
);

function getHistoryModel(season) {
	if (mongoose.models[season]) return mongoose.models[season];
	return mongoose.model(season, historySchema, season);
}

module.exports = getHistoryModel;
