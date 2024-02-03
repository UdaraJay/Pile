const fs = require('fs');
const path = require('path');
const glob = require('glob');
const matter = require('gray-matter');
const keytar = require('keytar');
const pileIndex = require('./pileIndex');
const { BrowserWindow } = require('electron');

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
    this.queryEngine = null;
    this.chatEngine = null;
  }

  async initialize(pilePath) {
    // Skip init if already setup
    if (this.pilePath === pilePath) {
      if (this.vectorIndex != null) {
        return true;
      }
    }

    this.pilePath = pilePath;

    try {
      await this.setAPIKeyToEnv();
      await this.setStorageContext();
      await this.setServiceContext();
      await this.initVectorStoreIndex();
      await this.initQueryEngine();
      await this.initChatEngine();
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async sendMessageToRenderer(channel = 'status', message) {
    let win = BrowserWindow.getFocusedWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, message);
    }
  }

  async setAPIKeyToEnv() {
    const apikey = await keytar.getPassword('pile', 'aikey');
    if (!apikey) {
      throw new Error('API key not found. Please set it first.');
    }
    process.env['OPENAI_API_KEY'] = apikey;
  }

  async setStorageContext() {
    const persistDirectory = path.join(this.pilePath, this.vectorIndexFolder); // Create a dedicated directory for storing the index
    this.storageContext = await storageContextFromDefaults({
      persistDir: persistDirectory,
    });
  }

  async setServiceContext() {
    this.serviceContext = serviceContextFromDefaults({
      llm: new OpenAI({
        model: 'gpt-4-0125-preview',
        temperature: 0.85,
        prompt:
          'As a wise librarian of this humans journals, how would you respond to this inquiry',
      }),
    });
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
      console.log('🛠️ Building fresh vector index');
      this.rebuildVectorIndex(this.pilePath);
    }
  }

  async initQueryEngine() {
    const retriever = this.vectorIndex.asRetriever();
    retriever.similarityTopK = 30;

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

  customContextSystemPrompt({ context = '' }) {
    // You can customize the prompt based on the context or other logic
    const systemPrompt = `System: You are an AI within my personal journal. Answer you questions primarily based on the context provided, only stray away from it when you think it's helpful. You have access to the user's journal entries as context, the user is aware of this so you don't need to preface that to the user. Don't answer in lists all the time. Make your outputs aesthetically pleasing. You are like a wise librarian of my thoughts, providing advice and counsel. You try to keep responses consise and get to the point quickly. You address the user as 'you', you don't need to know their name. You should engage with the user like you're a human \nCurrent date and time: ${new Date().toISOString()} \nSome relevant past journal entries for context: ${context}\nResponse:`;

    return systemPrompt;
  }

  async initChatEngine() {
    const retriever = this.vectorIndex.asRetriever();
    retriever.similarityTopK = 30;
    this.chatEngine = new ContextChatEngine({
      retriever,
      contextSystemPrompt: this.customContextSystemPrompt,
    });
  }

  async resetChatEngine() {
    const retriever = this.vectorIndex.asRetriever();
    retriever.similarityTopK = 30;
    this.chatEngine = new ContextChatEngine({
      retriever,
      contextSystemPrompt: this.customContextSystemPrompt,
    });
  }

  // This takes a new entry and its parent entry if available as
  // file paths relative to the pilePath and adds them to the vector index.
  // Entries are index by their relative path and therefore this can be used
  // when new entries are created or when they are updated.
  async add(pilePath, relativeFilePath, parentRelativeFilePath = null) {
    // Initialize if needed
    const initialized = await this.initialize(pilePath);
    if (!initialized) return;

    const filePath = path.join(pilePath, relativeFilePath);
    const fileContent = await fs.promises.readFile(filePath, 'utf-8');
    const { content, data: metadata } = matter(fileContent);

    // IS REPLY
    if (metadata.isReply) {
      if (!parentRelativeFilePath) {
        console.log(
          '❌ A parent file path needs to be provided when adding replies'
        );
      }

      const parentPath = path.join(pilePath, parentRelativeFilePath);
      const parentFileContent = await fs.promises.readFile(parentPath, 'utf-8');
      const { content: parentContent, data: parentMetadata } =
        matter(parentFileContent);

      const parent = new Document({
        id_: `${parentRelativeFilePath}`,
        text: parentContent,
        metadata: {
          ...parentMetadata,
          relativeFilePath: parentRelativeFilePath,
        },
      });

      // Reindex all the replies of the parent
      const childNodePromises = parentMetadata.replies.map(
        async (replyFilePath) => {
          const replyPath = path.join(pilePath, replyFilePath);
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

          // Set the parent relationship
          replyNode.relationships[NodeRelationship.PARENT] =
            parent.asRelatedNodeInfo();

          return replyNode.asRelatedNodeInfo();
        }
      );

      // Thread is the parent document
      parent.relationships[NodeRelationship.SOURCE] =
        parent.asRelatedNodeInfo();

      const replies = await Promise.all(childNodePromises);
      parent.relationships[NodeRelationship.CHILD] = replies;
      this.addDocument(parent);
    } else {
      // IS PARENT
      const parent = new Document({
        id_: `${relativeFilePath}`,
        text: content,
        metadata: { ...metadata, relativeFilePath: relativeFilePath },
      });

      parent.relationships[NodeRelationship.SOURCE] =
        parent.asRelatedNodeInfo(); // Set the source to itself
      this.addDocument(parent);
    }
  }

  // Returns the status of the index
  async getVectorIndex(pilePath) {
    if (pilePath === this.pilePath) {
      if (this.vectorIndex) {
        return true;
      }
    }

    // Initialize if needed
    await this.initialize(pilePath);
    return true;
  }

  async retrieve(query) {
    const retriever = this.vectorIndex.asRetriever();
    retriever.similarityTopK = 10;
    const nodes = await retriever.retrieve('query string');
    return nodes;
  }

  async query(text) {
    if (!this.queryEngine) {
      console.warn(
        'Query engine is not initialized. Please initialize it first.'
      );
      return;
    }

    const response = await this.queryEngine.query({ query: text });
    return response;
  }

   sanitize(text) {
    if (!text) {
        return " ";
    }
    return text;
}


  async chat(text) {
    if (!this.chatEngine) {
      console.warn(
        'Chat engine is not initialized. Please initialize it first.'
      );
      return;
    }

    let message = '';
    const stream = await this.chatEngine.chat({ message: this.sanitize(text), stream: true });

    for await (const chunk of stream) {
      const part = chunk?.response ?? ''
      message = message.concat(part);
      await this.sendMessageToRenderer('streamed_chat', part)
    }
    
    await this.sendMessageToRenderer('streamed_chat', '@@END@@')
    return message;
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
    const initialized = await this.initialize(pilePath);
    if (!initialized) return;

    // Load the base index
    this.pilePath = pilePath;
    const indexFileNamePath = path.join(this.pilePath, this.indexFileName);

    if (!fs.existsSync(indexFileNamePath)) return;

    const data = fs.readFileSync(indexFileNamePath);
    const index = new Map(JSON.parse(data));
    const documents = [];

    let count = 1;

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
            thread.asRelatedNodeInfo();

          const replies = await Promise.all(childNodePromises);
          thread.relationships[NodeRelationship.CHILD] = replies;

          this.addDocument(thread);

          this.sendMessageToRenderer('vector-index', {
            type: 'indexing',
            count: count,
            total: index.size,
            message: `Indexed entry ${count}/${index.size}`,
          });

          console.log('✅ Successfully indexed file', relativeFilePath);
        }
        count++;
      } catch (error) {
        this.sendMessageToRenderer('vector-index', {
          type: 'indexing',
          count: count,
          total: index.size,
          message: `Failed to index an entry. Skipping ${count}/${index.size}`,
        });
        console.log('❌ Failed to embed and index:', relativeFilePath);
      }
    }

    this.sendMessageToRenderer('vector-index', {
      type: 'done',
      count: index.size,
      total: index.size,
      message: `Indexing complete`,
    });
    console.log('🟢 Finished building index');
  }

  async buildVectorIndex() {
    await this._rebuildVectorIndex();
  }
}

module.exports = new PileVectorIndex();
