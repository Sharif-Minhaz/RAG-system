import { Pinecone } from "@pinecone-database/pinecone";
import readline from "readline";
import { HfInference } from "@huggingface/inference";
import { records } from "./data/index.js";

const hf = new HfInference(process.env.HF_ACCESS_TOKEN);

const pinecone = new Pinecone({
	apiKey: process.env.PINECONE_API_KEY,
});

async function getEmbedding(text) {
	try {
		const response = await hf.featureExtraction({
			model: "sentence-transformers/all-MiniLM-L6-v2",
			inputs: text,
		});
		return response;
	} catch (error) {
		console.error("Error getting embedding:", error);
		throw error;
	}
}

async function initializePinecone() {
	try {
		const indexName = "semantic-search";
		const indexList = await pinecone.listIndexes();

		const indexExists = indexList.indexes?.some((index) => index.name === indexName);

		if (!indexExists) {
			console.log(`Creating index: ${indexName}`);

			await pinecone.createIndex({
				name: indexName,
				dimension: 384,
				metric: "cosine",
				spec: {
					serverless: {
						cloud: "aws",
						region: "us-east-1",
					},
				},
				waitUntilReady: true,
			});

			console.log("Waiting for index to initialize...");
		}

		const index = pinecone.Index(indexName);

		// Upsert sample data
		console.log("Upserting sample data...");

		for (const item of records) {
			const embedding = await getEmbedding(item.chunk_text);

			await index.upsert([
				{
					id: item._id,
					values: embedding,
					metadata: {
						text: item.chunk_text,
						category: item.category,
					},
				},
			]);
		}

		console.log("Data upserted successfully!");
		return index;
	} catch (error) {
		console.error("Error initializing Pinecone:", error);
		throw error;
	}
}

// Search function
async function semanticSearch(query) {
	try {
		const index = pinecone.Index("semantic-search");

		const queryEmbedding = await getEmbedding(query);

		const searchResults = await index.query({
			vector: queryEmbedding,
			topK: 3,
			includeMetadata: true,
		});

		const formattedResults = searchResults.matches.map((match) => ({
			_id: match.id,
			text: match.metadata.text,
			category: match.metadata.category,
			score: match.score,
		}));

		let response = "I couldn't find relevant information for your query.";

		if (formattedResults.length > 0) {
			const topResult = formattedResults[0];

			if (
				query.toLowerCase().includes("albert einstein") &&
				topResult.text.toLowerCase().includes("albert einstein")
			) {
				response = `Based on my knowledge, ${topResult.text}`;
			} else {
				response = `Here's what I found: ${topResult.text}`;
			}
		}

		return {
			response,
			results: formattedResults,
		};
	} catch (error) {
		console.error("Search error:", error);
		throw error;
	}
}

async function main() {
	try {
		await initializePinecone();

		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		const askQuery = () => {
			rl.question('\nEnter a search query: (type "q" to quit) ', async (query) => {
				if (query.toLowerCase() === "q") {
					console.log("Exiting application...");
					rl.close();
					return;
				}

				try {
					const result = await semanticSearch(query);
					console.log("Response:", result.response);
					console.log("Results:");
					result.results.forEach((item, index) => {
						console.log(
							`  ${index + 1}. ${item.text} (${item.category}) - Score: ${(
								item.score * 100
							).toFixed(2)}%`
						);
					});
				} catch (error) {
					console.error("Error during search:", error);
				}

				askQuery();
			});
		};

		console.log("\n======== Interactive Search ========");
		console.log('Type a query to search or "exit" to quit');
		askQuery();
	} catch (error) {
		console.error("Application error:", error);
	}
}

main();
