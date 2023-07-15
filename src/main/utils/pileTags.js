const fs = require('fs');
const path = require('path');
const glob = require('glob');
const matter = require('gray-matter');

class PileTags {
  constructor() {
    this.fileName = 'tags.json';
    this.pilePath = null;
    this.tags = new Map();
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
    const tagsFilePath = path.join(this.pilePath, this.fileName);

    if (fs.existsSync(tagsFilePath)) {
      const data = fs.readFileSync(tagsFilePath);
      const loadedTags = new Map(JSON.parse(data));
      const sortedTags = this.sortMap(loadedTags);

      this.tags = sortedTags;

      return this.tags;
    } else {
      // save to initialize an empty index
      this.save();
      return this.tags;
    }
  }

  get() {
    return this.tags;
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

  add(tag, filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);

    if (this.tags.has(tag)) {
      let updatedTag = this.tags.get(tag);
      if (!updatedTag.posts.includes(tag)) {
        updatedTag.posts.push(filePath);
        this.tags.set(tag, updatedTag);
      }
    } else {
      const updatedTag = { color: null, icon: null, posts: [filePath] };
      this.tags.set(tag, updatedTag);
    }

    this.save();

    return this.tags;
  }

  remove(tag, filePath) {
    if (this.tags.has(tag)) {
      let updatedTag = this.tags.get(tag);
      updatedTag.posts = updatedTag.posts.filter((f) => f !== filePath);
      this.tags.set(tag, updatedTag);
      this.save();
    }

    return this.index;
  }

  save() {
    if (!this.pilePath) return;
    if (!fs.existsSync(this.pilePath)) {
      fs.mkdirSync(this.pilePath, { recursive: true });
    }

    const tagsPath = path.join(this.pilePath, this.fileName);
    const sortedTags = this.sortMap(this.tags);

    this.tags = sortedTags;
    const entries = this.tags.entries();

    if (!entries) return;

    let strMap = JSON.stringify(Array.from(entries));

    fs.writeFileSync(tagsPath, strMap);
  }
}

module.exports = new PileTags();
