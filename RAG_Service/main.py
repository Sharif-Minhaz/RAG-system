from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer
from transformers import pipeline
import numpy as np
import faiss

app = Flask(__name__)

# loading the embedding and generation models
embedding_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
generator = pipeline("text-generation", model="gpt2")  # using GPT-2 for demo purposes

# static documents
documents = [
    "Fellowcraft is a personal coaching app that provides guided meditations and structured learning programs.",
    "Users complete sequential content and unlock new lessons after marking previous ones complete.",
    "The CMS manages content, users, and notifications, integrating with AWS Cognito.",
    "The Node.js backend handles user authentication and communication with the Python RAG service.",
    "The Python RAG service handles vectorization, retrieval, and generation of responses.",
    "The MySQL database stores user data and query logs."
]
doc_embeddings = embedding_model.encode(documents, convert_to_numpy=True)
dimension = doc_embeddings.shape[1]
index = faiss.IndexFlatL2(dimension)
index.add(doc_embeddings)

# RAG endpoint
@app.route('/rag', methods=['POST'])
def rag():
    data = request.json
    query = data.get("query", "")
    if not query:
        return jsonify({"error": "No query provided"}), 400

    # embed the query and retrieve the top matching document
    query_embedding = embedding_model.encode([query], convert_to_numpy=True)
    D, I = index.search(query_embedding, 1)
    retrieved_doc = documents[I[0][0]]

    # create a prompt with the retrieved context and query
    prompt = f"Context: {retrieved_doc}\nQuery: {query}\nAnswer:"
    generated = generator(prompt, max_length=100, do_sample=False, early_stopping=True)[0]['generated_text']

    return jsonify({"response": generated})

if __name__ == '__main__':
    app.run(port=5000, debug=True)
