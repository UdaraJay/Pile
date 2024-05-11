const fs = require('fs');
const axios = require('axios');
const path = require('path');
const keytar = require('keytar');
const { walk } = require('../util');
const matter = require('gray-matter');

const createCosineSimilarityKernel = (gpu, vectorSize) => {
  return gpu.createKernel(
    function (vecA, vecB) {
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;

      for (let i = 0; i < vectorSize; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
      }

      normA = Math.sqrt(normA);
      normB = Math.sqrt(normB);

      if (normA === 0 || normB === 0) {
        return 0; // Avoid division by zero
      } else {
        return dotProduct / (normA * normB);
      }
    },
    {
      output: [1],
      constants: { vectorSize },
    }
  );
};

class PileEmbeddings {
  constructor() {
    this.pilePath = null;
    this.fileName = 'embeddings.json';
    this.apiKey = null;
    this.embeddings = new Map();
  }

  async initialize(pilePath, index) {
    try {
      this.pilePath = pilePath;
      await this.initializeAPIKey();

      if (!this.apiKey) {
        throw new Error('API key not found. Please set it first.');
      }
      const embeddingsFilePath = path.join(pilePath, this.fileName);
      if (fs.existsSync(embeddingsFilePath)) {
        const data = fs.readFileSync(embeddingsFilePath, 'utf8');
        this.embeddings = JSON.parse(data);
      } else {
        // Embeddings need to be generated based on the index
        await this.walkAndGenerateEmbeddings(pilePath, index);
        this.saveEmbeddings();
      }
    } catch (error) {
      console.error('Failed to load embeddings:', error);
    }
    return {};
  }

  async initializeAPIKey() {
    const apikey = await keytar.getPassword('pile', 'aikey');
    if (!apikey) {
      throw new Error('API key not found. Please set it first.');
    }

    this.apiKey = apikey;
  }

  async walkAndGenerateEmbeddings(pilePath, index) {
    console.log('🧮 Generating embeddings for index:', index.size);
    const embeddings = new Map();
    for (let [entryPath, metadata] of index) {
      try {
        //  we only index parent documents
        // the replies are concatenated to the contents
        if (metadata.isReply) continue;
        let fullPath = path.join(pilePath, entryPath);
        let fileContent = fs.readFileSync(fullPath, 'utf8');
        let { content } = matter(fileContent);

        content =
          'Entry on ' +
          metadata.createdAt +
          '\n\n' +
          content +
          '\n\nReplies:\n';

        // concat the contents of replies
        for (let replyPath of metadata.replies) {
          let replyFullPath = path.join(pilePath, replyPath);
          let replyFileContent = fs.readFileSync(replyFullPath, 'utf8');
          let { content: replyContent } = matter(replyFileContent);
          content += '\n' + replyContent;
        }

        const embedding = await this.generateEmbeddingForDocument(content);
        embeddings.set(entryPath, embedding);
        console.log('🧮 Embeddings created for threads: ', entryPath);
      } catch (error) {
        console.error('Failed to process thread for vector index.', error);
        continue;
      }
    }

    console.log('🧮 Embeddings generated:', embeddings.size);
    this.embeddings = embeddings;
    return embeddings;
  }

  saveEmbeddings() {
    try {
      const embeddingsFilePath = path.join(this.pilePath, this.fileName);

      const entries = this.embeddings.entries();
      if (!entries) return;
      let strMap = JSON.stringify(Array.from(entries));
      fs.writeFileSync(embeddingsFilePath, strMap, 'utf8');
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
      model: 'text-embedding-3-small',
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

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, topN);
  }
}

module.exports = new PileEmbeddings();
