import { HfInference } from "@huggingface/inference";
import { ChromaClient } from "chromadb";

const hf = new HfInference(process.env.HF_ACCESS_TOKEN);
const chroma = new ChromaClient({ path: "http://localhost:8000" });

async function getEmbedding(text) {
	const response = await hf.featureExtraction({
		model: "sentence-transformers/all-MiniLM-L6-v2",
		inputs: text,
	});
	return response;
}

async function getCollection() {
	return await chroma.getOrCreateCollection({ name: "rag_docs" });
}

async function insertDocument(id, text) {
	const collection = await getCollection();
	const embedding = await getEmbedding(text);

	await collection.add({
		ids: [id],
		embeddings: [embedding],
		documents: [text],
	});
}

async function searchDocuments(query, topK = 3) {
	const collection = await getCollection();
	const queryVector = await getEmbedding(query);

	const results = await collection.query({
		queryEmbeddings: [queryVector],
		nResults: topK,
	});
	return results.documents[0] || [];
}

async function generateRAGResponse(query) {
	const relevantDocs = await searchDocuments(query);
	// const context = relevantDocs.join("\n");
	const context = relevantDocs[0];
	return context;
}

(async () => {
	await insertDocument("doc1", "Node.js is a JavaScript runtime built on Chrome's V8 engine.");
	await insertDocument(
		"doc2",
		"RAG enhances chatbot responses by retrieving relevant information."
	);
	const response = await generateRAGResponse("What is RAG?");
	console.log("RAG Response:", response);
})();
