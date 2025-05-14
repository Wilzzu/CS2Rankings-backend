import axios from "axios";
import { proto } from "../utils/proto.js";

const playerNumber = 0;
const player = await axios
	.get(
		"https://api.steampowered.com/ICSGOServers_730/GetLeaderboardEntries/v1?format=json&lbname=official_leaderboard_premier_season2"
	)
	.then((lb) => lb.data.result.entries[playerNumber]);

console.log("Raw player data:", player);

const thousandSeparator = (score) => {
	let split = score
		.toString()
		.replace(/\B(?=(\d{3})+(?!\d))/g, "|")
		.split("|");
	if (split.length <= 1) return { big: split[0], small: "" };
	return { big: split[0], small: split[1] };
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

const playerObj = {
	id: "test-id",
	name: player?.name,
	rank: player?.rank,
	score: player?.score,
	formattedScore: thousandSeparator(player?.score),
	tier: calculateTier(player?.score),
	position: "unchanged",
	lastUpdate: Date.now(),
	missing: false,
	detailData: await proto(player?.detailData),
};

console.log("Parsed player data:", playerObj);
