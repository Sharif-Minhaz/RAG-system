import { useState } from "react";
import axios from "axios";

function App() {
	const [query, setQuery] = useState("");
	const [loading, setLoading] = useState(false);
	const [responseText, setResponseText] = useState("");

	const handleSubmit = async (e) => {
		e.preventDefault();
		try {
			setLoading(true);
			const res = await axios.post("http://localhost:3000/query", { query });
			setResponseText(
				`${res.data?.response?.split("Answer: ")[0] || "No response found from RAG"}`
			);
		} catch (error) {
			console.error("Error fetching response:", error);
			setResponseText("Error processing query");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div style={{ padding: "20px" }}>
			<h1>Fellowcraft RAG Demo</h1>
			<form onSubmit={handleSubmit}>
				<input
					type="text"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Enter your query"
					style={{ width: "300px", padding: "8px" }}
				/>
				<button type="submit" style={{ marginLeft: "10px", padding: "8px 12px" }}>
					Submit
				</button>
			</form>
			{loading && <p>Loading...</p>}
			{!loading && responseText && (
				<div style={{ marginTop: "20px" }}>
					<h2>Response:</h2>
					<p>{responseText}</p>
				</div>
			)}
		</div>
	);
}

export default App;
