const fs = require('fs');
const path = require('path');
const glob = require('glob');
const matter = require('gray-matter');
const pileSearchIndex = require('./pileSearchIndex');
const pileEmbeddings = require('./pileEmbeddings');
const { walk } = require('../util');
const { convertHTMLToPlainText } = require('../util');

class PileIndex {
  constructor() {
    this.fileName = 'index.json';
    this.pilePath = null;
    this.index = new Map();
  }

  sortMap(map) {
    let sortedMap = new Map(
      [...map.entries()].sort(
        (a, b) => new Date(b[1].createdAt) - new Date(a[1].createdAt)
      )
    );

    return sortedMap;
  }

  resetIndex() {
    this.index.clear();
  }

  async load(pilePath) {
    if (!pilePath) return;

    // a different pile is being loaded
    if (pilePath !== this.pilePath) {
      this.resetIndex();
    }

    this.pilePath = pilePath;
    const indexFilePath = path.join(this.pilePath, this.fileName);

    if (fs.existsSync(indexFilePath)) {
      const data = fs.readFileSync(indexFilePath);
      const loadedIndex = new Map(JSON.parse(data));
      const sortedIndex = this.sortMap(loadedIndex);
      this.index = sortedIndex;
    } else {
      // init empty index
      this.save();
      // try to recreate index by walking the folder system
      const index = await this.walkAndGenerateIndex(pilePath);
      this.index = index;
      this.save();
    }

    pileSearchIndex.initialize(this.pilePath, this.index);
    console.log('📍 SEARCH INDEX LOADED');
    await pileEmbeddings.initialize(this.pilePath, this.index);
    console.log('📍 VECTOR INDEX LOADED');

    return this.index;
  }

  walkAndGenerateIndex = (pilePath) => {
    return walk(pilePath).then((files) => {
      files.forEach((filePath) => {
        const relativeFilePath = path.relative(pilePath, filePath);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const { data } = matter(fileContent);
        this.index.set(relativeFilePath, data);
      });

      this.index = this.sortMap(this.index);
      return this.index;
    });
  };

  search(query) {
    let results = [];
    try {
      console.time('search-time');
      const entries = pileSearchIndex.search(query);
      results = entries.map((entry) => {
        const res = { ref: entry.ref, ...this.index.get(entry.ref) };
        return res;
      });
      console.timeEnd('search-time');
    } catch (error) {
      console.log('failed to search', error);
    }

    return results;
  }

  async vectorSearch(query, topN = 50) {
    let results = [];
    try {
      console.time('vector-search-time');
      const entries = await pileEmbeddings.search(query, topN);
      results = entries.map((entry) => {
        const res = { ref: entry, ...this.index.get(entry) };
        return res;
      });
      console.timeEnd('vector-search-time');
    } catch (error) {
      console.log('failed to vector search', error);
    }
    return results;
  }

  get() {
    return this.index;
  }

  add(relativeFilePath) {
    const filePath = path.join(this.pilePath, relativeFilePath);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);
    this.index.set(relativeFilePath, data);
    // add to search and vector index
    pileSearchIndex.initialize(this.pilePath, this.index);
    pileEmbeddings.addDocument(relativeFilePath, data);
    this.save();
    return this.index;
  }

  getThreadAsText(filePath) {
    try {
      let fullPath = path.join(this.pilePath, filePath);
      let fileContent = fs.readFileSync(fullPath, 'utf8');
      let { content, data: metedata } = matter(fileContent);

      content =
        `First entry at ${new Date(metedata.createdAt).toString()}:\n ` +
        convertHTMLToPlainText(content);

      // concat the contents of replies
      for (let replyPath of metedata.replies) {
        try {
          let replyFullPath = path.join(this.pilePath, replyPath);
          let replyFileContent = fs.readFileSync(replyFullPath, 'utf8');
          let { content: replyContent, data: replyMetadata } =
            matter(replyFileContent);
          content += `\n\n Reply at ${new Date(
            replyMetadata.createdAt
          ).toString()}:\n  ${convertHTMLToPlainText(replyContent)}`;
        } catch (error) {
          continue;
        }
      }
      return content;
    } catch (error) {
      console.log('Failed to get thread as text');
    }
  }

  // reply's parent needs to be found by checking every non isReply entry and
  // see if it's included in the replies array of the parent
  updateParentOfReply(replyPath) {
    const reply = this.index.get(replyPath);
    if (reply.isReply) {
      for (let [filePath, metadata] of this.index) {
        if (!metadata.isReply) {
          if (metadata.replies.includes(replyPath)) {
            // this is the parent
            metadata.replies = metadata.replies.filter((p) => {
              return p !== replyPath;
            });
            metadata.replies.push(filePath);
            this.index.set(filePath, metadata);
            this.save();
          }
        }
      }
    }
  }

  regenerateEmbeddings() {
    pileEmbeddings.regenerateEmbeddings(this.index);
    this.save();
    return;
  }

  update(relativeFilePath, data) {
    this.index.set(relativeFilePath, data);
    pileSearchIndex.initialize(this.pilePath, this.index);
    pileEmbeddings.addDocument(relativeFilePath, data);
    this.save();
    return this.index;
  }

  remove(relativeFilePath) {
    this.index.delete(relativeFilePath);
    this.save();

    return this.index;
  }

  save() {
    if (!this.pilePath) return;
    if (!fs.existsSync(this.pilePath)) {
      fs.mkdirSync(this.pilePath, { recursive: true });
    }

    const sortedIndex = this.sortMap(this.index);
    this.index = sortedIndex;
    const filePath = path.join(this.pilePath, this.fileName);
    const entries = this.index.entries();

    if (!entries) return;

    let strMap = JSON.stringify(Array.from(entries));
    fs.writeFileSync(filePath, strMap);
  }
}

module.exports = new PileIndex();
