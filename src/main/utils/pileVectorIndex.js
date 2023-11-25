const fs = require('fs');
const path = require('path');
const glob = require('glob');
const matter = require('gray-matter');
const keytar = require('keytar');
const pileIndex = require('./pileIndex');

const {
  TextNode,
  Document,
  OpenAI,
  RetrieverQueryEngine,
  ContextChatEngine,
  SimilarityPostprocessor,
  VectorStoreIndex,
  NodeRelationship,
  storageContextFromDefaults,
  serviceContextFromDefaults,
} = require('llamaindex');

class PileVectorIndex {
  constructor() {
    this.pilePath = null;
    this.indexFileName = 'index.json';
    this.vectorIndexFolder = 'vector-index';
    this.vectorIndex = null;
  }

  async initialize(pilePath) {
    await this.setAPIKeyToEnv();
    await this.setStorageContext(pilePath);
    await this.setServiceContext();
    await this.initVectorStoreIndex();
    await this.initQueryEngine();
  }

  async setAPIKeyToEnv() {
    const apikey = await keytar.getPassword('pile', 'aikey');
    if (!apikey) {
      console.error('API key not found. Please set it first.');
      return;
    }
    process.env['OPENAI_API_KEY'] = apikey;
  }

  async setStorageContext(pilePath) {
    const persistDirectory = path.join(pilePath, this.vectorIndexFolder); // Create a dedicated directory for storing the index
    this.storageContext = await storageContextFromDefaults({
      persistDir: persistDirectory,
    });
  }

  async setServiceContext() {
    this.serviceContext = serviceContextFromDefaults({
      llm: new OpenAI({
        model: 'gpt-4-0613',
        temperature: 0.9,
        prompt: 'As a wise librarian, how would you respond to this inquiry',
      }),
    });
  }

  // Just passes back status
  async getVectorIndex(pilePath) {
    if (this.vectorIndex) {
      if (pilePath === this.pilePath) {
        return true;
      }
    }

    // Initialize vector store for this Pile
    await this.initialize(pilePath);
    return 'initialized';
  }

  // This fails the first time the store is being
  // initialized. In such case, we will init an empty store
  // with a placeholder document when it's caught.
  async initVectorStoreIndex() {
    try {
      this.vectorIndex = await VectorStoreIndex.init({
        storageContext: this.storageContext,
        serviceContext: this.serviceContext,
      });
    } catch (error) {
      const placeholderDocument = new Document({
        text: '',
        id_: 'placeholder',
      });
      this.vectorIndex = await VectorStoreIndex.fromDocuments(
        [placeholderDocument],
        {
          storageContext: this.storageContext,
          serviceContext: this.serviceContext,
        }
      );

      // Build the vector store for existing entries.
      console.log('🛠️ Building vector index');
      this.rebuildVectorIndex();
    }
  }

  async initQueryEngine() {
    const retriever = this.vectorIndex.asRetriever();
    retriever.similarityTopK = 10;

    const nodePostprocessor = new SimilarityPostprocessor({
      similarityCutoff: 0.7,
    });

    this.queryEngine = new RetrieverQueryEngine(
      retriever,
      undefined,
      undefined,
      [nodePostprocessor]
    );
  }

  async initChatEngine() {
    const retriever = this.vectorIndex.asRetriever();
    retriever.similarityTopK = 10;
    this.chatEngine = new ContextChatEngine({ retriever });
  }

  async retriever(query) {
    const retriever = this.vectorIndex.asRetriever();
    retriever.similarityTopK = 10;
    const nodes = await retriever.retrieve('query string');
    console.log('retrieved nodes', nodes);
    return nodes;
  }

  async query(text) {
    if (!this.queryEngine) {
      console.warn(
        'Query engine is not initialized. Please initialize it first.'
      );
      return;
    }

    const response = await this.queryEngine.query(text);
    return response;
  }

  async addDocument(thread) {
    try {
      // Generate embeddings for the document node
      const nodesWithEmbeddings =
        await VectorStoreIndex.getNodeEmbeddingResults(
          [thread],
          this.vectorIndex.serviceContext,
          true // logProgress for debugging
        );

      await this.vectorIndex.insertNodes(nodesWithEmbeddings);
    } catch (error) {
      console.error('Error adding document to VectorStoreIndex:', error);
    }
  }

  // Rebuild vector index from the base index.json
  async rebuildVectorIndex(pilePath) {
    if (!pilePath) return;

    // Setup or load the vector store
    await this.initialize(pilePath);

    // Load the base index
    this.pilePath = pilePath;
    const indexFileNamePath = path.join(this.pilePath, this.indexFileName);

    if (!fs.existsSync(indexFileNamePath)) return;

    const data = fs.readFileSync(indexFileNamePath);
    const index = new Map(JSON.parse(data));
    const documents = [];

    console.log('🟢 Rebuilding vector store...');
    // it makes sense to compile each thread into one document before
    // injesting it here... the metadata can includes the relative paths of
    // each post in case we want to render them in UI
    for (let [relativeFilePath, metadata] of index) {
      try {
        // documents represent threads so we pass replies
        if (!metadata.isReply) {
          const filePath = path.join(this.pilePath, relativeFilePath);
          const fileContent = await fs.promises.readFile(filePath, 'utf-8');
          const { content } = matter(fileContent);

          let thread = new Document({
            id_: `${relativeFilePath}`,
            text: content,
            metadata: { ...metadata, relativeFilePath },
          });

          const childNodePromises = metadata.replies.map(
            async (replyFilePath) => {
              const replyPath = path.join(this.pilePath, replyFilePath);
              const replyFileContent = await fs.promises.readFile(
                replyPath,
                'utf-8'
              );
              const { content: replyContent, data: replyMetadata } =
                matter(replyFileContent);

              const replyNode = new TextNode({
                id_: `${replyPath}`,
                text: replyContent,
                metadata: { ...replyMetadata, replyPath },
              });

              // Set the main post as parent
              replyNode.relationships[NodeRelationship.PARENT] =
                thread.asRelatedNodeInfo();

              return replyNode.asRelatedNodeInfo();
            }
          );

          // Thread is the parent document
          thread.relationships[NodeRelationship.SOURCE] =
            thread.asRelatedNodeInfo(); // Set the source to itself

          const replies = await Promise.all(childNodePromises);
          // Assuming you have a list of reply nodes
          replies.forEach((replyNode) => {
            replyNode.relationships[NodeRelationship.SOURCE] =
              thread.asRelatedNodeInfo(); // Set the source to the main document
          });

          thread.relationships[NodeRelationship.CHILD] = replies;
          this.addDocument(thread);
          console.log('✅ Successfully indexed file', relativeFilePath);
        }
      } catch (error) {
        console.log('❌ Failed to embed and index:', relativeFilePath);
      }
    }
    console.log('🟢 Finished building index');
  }

  async buildVectorIndex() {
    await this._rebuildVectorIndex();
  }
}

module.exports = new PileVectorIndex();
