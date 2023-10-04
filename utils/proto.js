// Huge thanks to https://github.com/6413 for helping with parsing the detailed data and https://github.com/zer0k-z https://github.com/BeepIsla for providing resources

const protobuf = require("protobufjs");

// Find matchentry values by tag
const findTag = (object, number) => {
	let value = object.matchentries.find((e) => e.tag === number);
	if (value) return value.val;
	return 0;
};

const parseRegion = (object, number) => {
	let value = object.matchentries.find((e) => e.tag === number);
	if (!value) return "??";

	switch (value.val) {
		case 1:
			return "NA";
		case 2:
			return "SA";
		case 3:
			return "EU";
		case 4:
			return "AS";
		case 5:
			return "AU";
		case 7:
			return "AF";
		case 9:
			return "CN";
		default:
			return "??";
	}
};

const calcWinPercentage = (wins, ties, losses) => {
	let rounded = Math.round((wins / (wins + ties + losses)) * 1000) / 10;
	if (rounded === 100) return rounded;
	return rounded.toFixed(1);
};

// decode varint from binary data
function decodeVarint(bytes, offset) {
	let result = 0;
	let shift = 0;
	let index = offset;

	while (true) {
		const byte = bytes[index];
		result |= (byte & 0x7f) << shift;
		shift += 7;
		index++;
		if ((byte & 0x80) === 0) {
			break;
		}
	}

	return [result, index - offset];
}

const parseProto = (hex) => {
	return new Promise((resolve, reject) => {
		protobuf.load("lib/detailData.proto", (err, root) => {
			if (err) reject(err);
			else {
				const ScoreLeaderboardData = root.lookupType("ScoreLeaderboardData");

				// Remove padding
				let offset = -1;
				for (i = hex.length; i--; ) {
					if (hex[i] != "0") break;
					offset = i;
				}
				if (offset != -1) {
					hex = hex.substring(0, offset);
				}

				// Convert hex string to binary data
				const binaryData = Buffer.from(hex, "hex");

				// Decode varint to get the message and header length
				const [messageLength, headerLength] = decodeVarint(binaryData, 0);

				// Convert buffer to Uint8Array
				const dataBytes = new Uint8Array(binaryData.slice(headerLength));

				// Check if data length is as expected
				if (dataBytes.length !== messageLength) {
					console.log("Invalid data length for " + hex);
					return {};
				}

				// Decode binary data using the proto
				const decodedMessage = ScoreLeaderboardData.decode(dataBytes);

				const jsObject = ScoreLeaderboardData.toObject(decodedMessage, {
					longs: Number,
					enums: String,
					bytes: String,
				});

				// Find the map value
				const value = jsObject.matchentries.find((e) => e.tag === 19).val;

				// Convert the 32 bit value to a binary string
				const binaryString = value.toString(2);

				// Every map has 4 bits reserved, so 7 maps is 7 x 4 bits = 28 bits
				// If more maps are added change the 28
				// Make sure the binary string has leading zeros if needed to make it 32 bits
				const paddedBinaryString = binaryString.padStart(28, "0");

				// Array for final map values
				const mapValues = [];

				// Split the binary string into 4 bit segments and convert to numbers
				for (let i = 0; i < 28; i += 4) {
					const segmentBinary = paddedBinaryString.slice(i, i + 4);
					const segmentValue = parseInt(segmentBinary, 2);
					mapValues.push(segmentValue);
				}

				// Set match stats
				const matches = {
					wins: findTag(jsObject, 16),
					ties: findTag(jsObject, 17),
					losses: findTag(jsObject, 18),
				};

				// console.log(`Parsed ${hex[0]}${hex[1]}${hex[2]}${hex[3]}, ${parseRegion(jsObject, 21)}`);
				// Create final return object
				const final = {
					wins: matches.wins,
					ties: matches.ties,
					losses: matches.losses,
					winpercentage: calcWinPercentage(matches.wins, matches.ties, matches.losses),
					maps: {
						ancient: mapValues[0],
						nuke: mapValues[1],
						overpass: mapValues[2],
						vertigo: mapValues[3],
						mirage: mapValues[4],
						inferno: mapValues[5],
						anubis: mapValues[6],
					},
					region: parseRegion(jsObject, 21),
				};
				resolve(final);
			}
		});
	});
};

const proto = async (hex) => {
	return parseProto(hex)
		.then((result) => {
			return result;
		})
		.catch((error) => {
			console.log("Error:", error);
			return {};
		});
};

module.exports = { proto };
