const fs = require('fs');
const path = require('path');
const glob = require('glob');
const matter = require('gray-matter');

const defaultHighlights = new Map([
  ['Highlight', { color: '#FF703A', order: 0, posts: [] }],
  ['Do later', { color: '#4de64d', order: 1, posts: [] }],
  ['New idea', { color: '#017AFF', order: 2, posts: [] }],
]);

class PileHighlights {
  constructor() {
    this.fileName = 'highlights.json';
    this.pilePath = null;
    this.highlights = new Map();
  }

  sortMap(map) {
    let sortedMap = new Map(
      [...map.entries()].sort((a, b) => (a[1].order ?? 0) - (b[1].order ?? 0))
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

      // Ensure all highlights have an order field (migration for existing data)
      let needsSave = false;
      let index = 0;
      loadedHighlights.forEach((value, key) => {
        if (value.order === undefined) {
          value.order = index;
          needsSave = true;
        }
        index++;
      });

      const sortedHighlights = this.sortMap(loadedHighlights);
      this.highlights = sortedHighlights;

      if (needsSave) {
        this.save();
      }

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

  create(name, color) {
    if (this.highlights.has(name)) {
      return this.highlights;
    }

    // Find the next available order number
    let maxOrder = -1;
    this.highlights.forEach((value) => {
      if (value.order !== undefined && value.order > maxOrder) {
        maxOrder = value.order;
      }
    });

    // create a new highlight with given name, color, and order
    const newHighlight = { color: color || '#808080', order: maxOrder + 1, posts: [] };
    this.highlights.set(name, newHighlight);

    this.save();

    return this.highlights;
  }

  update(oldName, newName, color) {
    if (!this.highlights.has(oldName)) {
      return this.highlights;
    }

    const existingHighlight = this.highlights.get(oldName);

    // If the name is changing and the new name already exists, reject
    if (oldName !== newName && this.highlights.has(newName)) {
      return this.highlights;
    }

    // Update the highlight
    const updatedHighlight = {
      ...existingHighlight,
      color: color || existingHighlight.color,
    };

    // If name changed, delete old and add new
    if (oldName !== newName) {
      this.highlights.delete(oldName);
      this.highlights.set(newName, updatedHighlight);
    } else {
      this.highlights.set(oldName, updatedHighlight);
    }

    this.save();

    return this.highlights;
  }

  reorder(orderedNames) {
    // Update order field based on array position
    orderedNames.forEach((name, index) => {
      if (this.highlights.has(name)) {
        const highlight = this.highlights.get(name);
        highlight.order = index;
        this.highlights.set(name, highlight);
      }
    });

    this.save();

    return this.highlights;
  }

  delete(highlight) {
    if (this.highlights.has(highlight)) {
      this.highlights.delete(highlight);
      this.save();
    }

    return this.highlights;
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
