const cors = require("cors");
const express = require("express");
const axios = require("axios");
const mysql = require("mysql2");

const app = express();
app.use(cors());
app.use(express.json());

// MySQL connection pool
const pool = mysql.createPool({
	host: "localhost",
	user: "root",
	password: process.env.PASSWORD,
	database: "rag_db",
});

// Route to log the query and forward it to the Python RAG service
app.post("/query", async (req, res) => {
	try {
		const { query } = req.body;
		if (!query) {
			return res.status(400).json({ error: "No query provided" });
		}

		// Log the query in MySQL
		pool.query(
			"INSERT INTO query_logs (query_text, created_at) VALUES (?, NOW())",
			[query],
			(err, results) => {
				if (err) {
					console.error("Error logging query:", err);
				} else {
					console.log("Logged query with id:", results.insertId);
				}
			}
		);

		// Forward the query to the Python microservice
		const response = await axios.post("http://localhost:5000/rag", { query });
		res.json({ response: response.data.response });
	} catch (error) {
		console.error("Error in /query:", error);
		res.status(500).json({ error: "Error processing query" });
	}
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Node.js server listening on port ${PORT}`));
