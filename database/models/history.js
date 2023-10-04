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

const History = mongoose.model("History", historySchema);
module.exports = History;
