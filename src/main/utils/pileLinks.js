const fs = require('fs');
const path = require('path');

class PileLinks {
  constructor() {
    this.fileName = 'links.json';
    this.pilePath = null;
    this.links = new Map();
  }

  resetIndex() {
    this.links.clear();
  }

  load(pilePath) {
    if (!pilePath) return;

    // skip loading
    if (pilePath === this.pilePath) {
      return;
    }

    // a different pile is being loaded
    if (pilePath !== this.pilePath) {
      this.resetIndex();
    }

    this.pilePath = pilePath;
    const linksFilePath = path.join(this.pilePath, this.fileName);

    if (fs.existsSync(linksFilePath)) {
      const data = fs.readFileSync(linksFilePath);
      const loadedIndex = new Map(JSON.parse(data));
      this.links = loadedIndex;

      return loadedIndex;
    } else {
      this.save();
      return this.links;
    }
  }

  get(pilePath, url) {
    if (pilePath !== this.pilePath) {
      this.load(pilePath);
    }
    return this.links.get(url);
  }

  set(pilePath, url, data) {
    if (pilePath !== this.pilePath) {
      this.load(pilePath);
    }

    this.links.set(url, data);
    this.save();

    return this.links;
  }

  save() {
    if (!this.pilePath) return;
    if (!fs.existsSync(this.pilePath)) {
      fs.mkdirSync(this.pilePath, { recursive: true });
    }

    const filePath = path.join(this.pilePath, this.fileName);
    const entries = this.links.entries();

    if (!entries) return;

    let strMap = JSON.stringify(Array.from(entries));
    fs.writeFileSync(filePath, strMap);
  }
}

module.exports = new PileLinks();
