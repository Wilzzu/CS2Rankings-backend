const { default: mongoose } = require("mongoose");
const getHistoryModel = require("../database/models/history");
const settings = require("../settings.json");
const fs = require("fs");
require("dotenv").config();

/*
    This script is used to archive player history data from current season's files to the season's history collection.
    The script will only copy the players that are present in the final leaderboards of the old season.
    This should be run when the season is changing.
*/

const seasonName = "season1";
const dbURL = `${process.env.MONGODB_URI}playerdata?retryWrites=true&w=majority`;

mongoose
	.connect(dbURL)
	.then(() => processFiles())
	.catch((err) => console.log(err));

async function processFiles() {
	try {
		// Define the whitelist of files to process
		const whitelist = [
			"africa.json",
			"asia.json",
			"australia.json",
			"china.json",
			"europe.json",
			"northamerica.json",
			"southamerica.json",
		];

		// Read all files in the directory
		const files = await fs.promises.readdir(`./database/oldSeasons/${seasonName}/`);

		// Filter files to include only those in the whitelist
		const filesToProcess = files.filter((file) => whitelist.includes(file));
		console.log(`Found ${filesToProcess.length}/${whitelist.length} files to process!`);

		// Process files sequentially
		for (const file of filesToProcess) {
			console.log("Starting file:", file);
			const data = await fs.promises.readFile(
				`./database/oldSeasons/${seasonName}/${file}`,
				"utf8"
			);

			const region = JSON.parse(data);

			// Process each player in the file
			for (const [index, player] of region.players.entries()) {
				if (player.missing) continue;

				// Find and copy the player
				const doc = await getHistoryModel(settings.currentSeason).findOne({
					name: encodeURIComponent(player.name),
				});

				if (!doc) {
					console.log(`${file} | Player #${index} "${player.name}" not found in the database!`);
					continue;
				}

				// Copy the player to the new collection
				const copyPlayerDoc = new (getHistoryModel(seasonName))(doc.toObject());
				await copyPlayerDoc.save();

				console.log(`${file} | Copied player #${index} "${player.name}"!`);
			}
		}

		console.log("All files processed!");
	} catch (error) {
		console.error("Error processing files:", error);
	}
}
