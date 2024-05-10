const fs = require('fs');
const axios = require('axios');
const path = require('path');

class EmbeddingSearch {
  constructor(embeddingsFilePath, apiKey) {
    this.embeddingsFilePath = embeddingsFilePath;
    this.apiKey = apiKey;
    this.embeddings = this.loadEmbeddings();
  }

  loadEmbeddings() {
    try {
      if (fs.existsSync(this.embeddingsFilePath)) {
        const data = fs.readFileSync(this.embeddingsFilePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load embeddings:', error);
    }
    return {};
  }

  saveEmbeddings() {
    try {
      fs.writeFileSync(
        this.embeddingsFilePath,
        JSON.stringify(this.embeddings, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Failed to save embeddings:', error);
    }
  }

  async addDocument(docId, document) {
    const embedding = await this.generateEmbeddingForDocument(document);
    if (embedding) {
      this.embeddings[docId] = embedding;
      this.saveEmbeddings();
    }
  }

  async generateEmbeddingForDocument(document) {
    const url = 'https://api.openai.com/v1/embeddings';
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
    const data = {
      model: 'text-embedding-ada-002', // still same for gpt-4?
      input: document,
    };

    try {
      const response = await axios.post(url, data, { headers });
      return response.data.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return null;
    }
  }

  async searchDocuments(queryDocument, topN = 50) {
    const queryEmbedding = await this.generateEmbeddingForDocument(
      queryDocument
    );
    if (!queryEmbedding) {
      console.error('Failed to generate query embedding.');
      return [];
    }

    let scores = Object.entries(this.embeddings).map(([docId, embedding]) => ({
      docId,
      score: cosineSimilarity(embedding, queryEmbedding),
    }));

    scores.sort((a, b) => b.score - a.score); // Sort by score descending
    return scores.slice(0, topN); // Return top N results
  }
}

module.exports = EmbeddingSearch;
