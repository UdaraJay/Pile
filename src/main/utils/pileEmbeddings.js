const fs = require('fs');
const axios = require('axios');
const path = require('path');
const keytar = require('keytar');
const { walk } = require('../util');
const matter = require('gray-matter');

// Todo: Cache the norms alongside embeddings at some point
// to avoid recomputing them for every query
function cosineSimilarity(embedding, queryEmbedding) {
  if (embedding.length !== queryEmbedding.length) {
    throw new Error('Vectors have different dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < embedding.length; i++) {
    dotProduct += embedding[i] * queryEmbedding[i];
    normA += embedding[i] ** 2;
    normB += queryEmbedding[i] ** 2;
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    throw new Error('One of the vectors is zero, cannot compute similarity');
  }

  return dotProduct / (normA * normB);
}

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
        this.embeddings = new Map(JSON.parse(data));
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
    this.embeddings = new Map();
    for (let [entryPath, metadata] of index) {
      this.addDocument(entryPath, metadata);
    }
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

  async addDocument(entryPath, metadata) {
    try {
      //  we only index parent documents
      // the replies are concatenated to the contents
      if (metadata.isReply) return;
      let fullPath = path.join(this.pilePath, entryPath);
      let fileContent = fs.readFileSync(fullPath, 'utf8');
      let { content } = matter(fileContent);

      content =
        'Entry on ' + metadata.createdAt + '\n\n' + content + '\n\nReplies:\n';

      // concat the contents of replies
      for (let replyPath of metadata.replies) {
        let replyFullPath = path.join(this.pilePath, replyPath);
        let replyFileContent = fs.readFileSync(replyFullPath, 'utf8');
        let { content: replyContent } = matter(replyFileContent);
        content += '\n' + replyContent;
      }

      const embedding = await this.generateEmbedding(content);
      this.embeddings.set(entryPath, embedding);
      this.saveEmbeddings();
      console.log('🧮 Embeddings created for threads: ', entryPath);
    } catch (error) {
      console.error('Failed to process thread for vector index.', error);
      return;
    }
  }

  async generateEmbedding(document) {
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

  async search(query, topN = 50) {
    const queryEmbedding = await this.generateEmbedding(query);

    if (!queryEmbedding) {
      console.error('Failed to generate query embedding.');
      return [];
    }

    let scores = [];
    this.embeddings.forEach((embedding, entryPath) => {
      let score = cosineSimilarity(embedding, queryEmbedding);
      scores.push({ entryPath, score });
    });

    scores.sort((a, b) => b.score - a.score);
    const topNEntries = scores.slice(0, topN).map((s) => s.entryPath);
    return topNEntries;
  }
}

module.exports = new PileEmbeddings();
