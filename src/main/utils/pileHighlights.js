const fs = require('fs');
const path = require('path');
const glob = require('glob');
const matter = require('gray-matter');

const defaultHighlights = new Map([
  ['Highlight', { color: '#FF703A', posts: [] }],
  ['Do later', { color: '#4de64d', posts: [] }],
  ['New idea', { color: '#017AFF', posts: [] }],
]);

class PileHighlights {
  constructor() {
    this.fileName = 'highlights.json';
    this.pilePath = null;
    this.highlights = new Map();
  }

  sortMap(map) {
    let sortedMap = new Map(
      [...map.entries()].sort((a, b) => a[1].posts.length - b[1].posts.length)
    );

    return sortedMap;
  }

  load(pilePath) {
    if (!pilePath) return;
    this.pilePath = pilePath;
    const highlightsFilePath = path.join(this.pilePath, this.fileName);

    if (fs.existsSync(highlightsFilePath)) {
      const data = fs.readFileSync(highlightsFilePath);
      const loadedHighlights = new Map(JSON.parse(data));
      const sortedHighlights = this.sortMap(loadedHighlights);

      this.highlights = sortedHighlights;

      return this.highlights;
    } else {
      // save to initialize an empty index
      this.highlights = defaultHighlights;
      this.save();
      return this.highlights;
    }
  }

  get() {
    return this.highlights;
  }

  sync(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);
    const tags = data.tags || [];

    if (!tags) return;

    tags.forEach((tag) => {
      this.add(tag, filePath);
    });
  }

  create(highlight, filePath) {
    if (this.highlights.has(highlight)) {
      return;
    }

    // create a new highlight
    const newHighlight = { color: null, icon: null, posts: [] };
    this.highlights.set(tag, newHighlight);

    this.save();

    return this.highlights;
  }

  delete(highlight) {
    if (this.highlights.has(highlight)) {
      let updatedHighlight = this.highlights.get(highlight);
      this.highlights.set(highlight, updatedHighlight);

      // Todo: delete this tag from all the posts before
      // deleting it

      this.save();
    }

    return this.index;
  }

  save() {
    if (!this.pilePath) return;
    if (!fs.existsSync(this.pilePath)) {
      fs.mkdirSync(this.pilePath, { recursive: true });
    }

    const highlightsFilePath = path.join(this.pilePath, this.fileName);
    const sortedHighlights = this.sortMap(this.highlights);

    this.highlights = sortedHighlights;
    const entries = this.highlights.entries();

    if (!entries) return;

    let strMap = JSON.stringify(Array.from(entries));

    fs.writeFileSync(highlightsFilePath, strMap);
  }
}

module.exports = new PileHighlights();
