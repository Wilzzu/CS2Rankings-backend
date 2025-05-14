![Banner](https://i.imgur.com/hMWEXdz.png)

<h1 align="center">CS2Rankings Backend</h1>

This is the backend for [CS2Rankings](https://cs2rankings.com/), a React website that shows live Counter-Strike 2 leaderboard rankings. The backend is responsible for fetching player data from the official Steam API and then parsing and storing that data in a database. The frontend then fetches this data from the database and displays it to the user.

You can find the main repository with the frontend [here](https://github.com/Wilzzu/CS2Rankings).

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) `v14.20.1` or higher
- [npm](https://www.npmjs.com/) `v6` or higher

### Installation

1. **Clone the repository:**

   ```
   git clone https://github.com/Wilzzu/CS2Rankings-backend.git
   cd CS2Rankings-backend
   ```

2. **Install dependencies:**

   ```
   npm install
   ```

3. **Configure environment variables:**

   Rename the `.env.example` file to `.env` and fill in the variables:

   | Variable      | Description                                                                                 |
   | ------------- | ------------------------------------------------------------------------------------------- |
   | `PORT`        | Port number for the server.                                                                 |
   | `MONGODB_URI` | MongoDB connection URI found in `Database` > `Connect` > `Drivers` in your MongoDB project. |

4. **Start the server:**

   ```
    npm run start
   ```

## API Endpoints

- `GET /api/leaderboard/:season/:region` - Retrieve the leaderboard for a specific season and region.
- `GET /api/history/:season/:name` - Retrieve the history of a player for a specific season.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
