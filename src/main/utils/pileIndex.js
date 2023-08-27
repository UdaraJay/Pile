const fs = require('fs');
const path = require('path');
const glob = require('glob');
const matter = require('gray-matter');

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

  load(pilePath) {
    if (!pilePath) return;
    this.pilePath = pilePath;
    const indexFilePath = path.join(this.pilePath, this.fileName);

    if (fs.existsSync(indexFilePath)) {
      const data = fs.readFileSync(indexFilePath);
      const loadedIndex = new Map(JSON.parse(data));
      const sortedIndex = this.sortMap(loadedIndex);

      this.index = sortedIndex;

      return sortedIndex;
    } else {
      // save to initialize an empty index
      this.save();
      return this.index;
    }
  }

  recreateCurrentIndex() {
    // glob(path.join(directory, '**', '*.md'), (error, files) => {
    //   if (error) {
    //     console.error(error);
    //   } else {
    //     // iterate through files
    //     for (file in files) {
    //       const content = fs.readFileSync(filePath, 'utf8');
    //       const { data: frontmatter, content } = matter(fileContent);
    //     }
    //   }
    // });
  }

  get() {
    return this.index;
  }

  add(relativeFilePath) {
    const filePath = path.join(this.pilePath, relativeFilePath);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);

    this.index.set(relativeFilePath, data);

    this.save();

    return this.index;
  }

  // TODO: we should deal with the relative path here
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
