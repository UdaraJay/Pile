const fs = require('fs');
const path = require('path');
const glob = require('glob');
const matter = require('gray-matter');
const pileSearchIndex = require('./pileSearchIndex');
const { walk } = require('../util');
const pileEmbeddings = require('./pileEmbeddings');

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

    // test generating index on the fly
    // const index = await this.walkAndGenerateIndex(pilePath);
    // return index;
    if (fs.existsSync(indexFilePath)) {
      const data = fs.readFileSync(indexFilePath);
      const loadedIndex = new Map(JSON.parse(data));
      const sortedIndex = this.sortMap(loadedIndex);
      this.index = sortedIndex;
      this.searchIndex = pileSearchIndex.initialize(this.pilePath, sortedIndex);
      this.vectorIndex = pileEmbeddings.initialize(this.pilePath, sortedIndex);
      return sortedIndex;
    } else {
      // init empty index
      this.save();
      // try to recreate index by walking the folder system
      const index = await this.walkAndGenerateIndex(pilePath);
      this.index = index;
      this.save();
      return this.index;
    }
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
      results = this.searchIndex.search(query);
    } catch (error) {
      console.log('failed to search', error);
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
    this.searchIndex = pileSearchIndex.initialize(this.pilePath, this.index);
    this.save();
    return this.index;
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

  update(relativeFilePath, data) {
    this.index.set(relativeFilePath, data);
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
