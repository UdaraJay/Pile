const fs = require('fs');
const path = require('path');
const lunr = require('lunr');
const matter = require('gray-matter');
const { BrowserWindow } = require('electron');

class PileSearchIndex {
  constructor() {
    this.pilePath = null;
    this.indexFileName = 'search_index.json';
    this.index = null;
  }

  initialize(pilePath, index) {
    this.pilePath = pilePath;
    const searchIndex = this.loadIndex(pilePath, index);
    return searchIndex;
  }

  loadIndex(pilePath, index) {
    try {
      const indexPath = path.join(pilePath, this.indexFileName);
      if (fs.existsSync(indexPath)) {
        const serializedIndex = fs.readFileSync(indexPath, 'utf8');
        this.index = lunr.Index.load(JSON.parse(serializedIndex));
      } else {
        this.index = lunr((builder) => {
          builder.ref('id');
          builder.field('title');
          builder.field('content');
          builder.field('highlight');
          builder.field('createdAt');
          builder.field('updatedAt');
          builder.field('isReply');
          builder.field('isAI');

          for (let [filePath, metadata] of index) {
            try {
              //  we only index parent documents
              // the replies are concatenated to the contents
              if (metadata.isReply) continue;
              let fullPath = path.join(this.pilePath, filePath);
              let fileContent = fs.readFileSync(fullPath, 'utf8');
              let { content } = matter(fileContent);

              // concat the contents of replies
              for (let replyPath of metadata.replies) {
                let replyFullPath = path.join(this.pilePath, replyPath);
                let replyFileContent = fs.readFileSync(replyFullPath, 'utf8');
                let { content: replyContent } = matter(replyFileContent);
                content += '\n' + replyContent;
              }

              let doc = {
                id: filePath,
                title: metadata.title,
                content: content,
                isReply: metadata.isReply,
                isAI: metadata.isAI,
                highlight: metadata.highlight,
                createdAt: metadata.createdAt,
                updatedAt: metadata.updatedAt,
              };

              builder.add(doc);
            } catch (error) {
              // console.error('Failed to process file: ', error);
            }
          }
        });

        this.saveIndex();
      }

      return this.index;
    } catch (error) {
      console.error('Error loading the index:', error);
      this.index = lunr(function () {
        this.ref('id');
        this.field('title');
        this.field('content');
        this.field('highlight');
        this.field('createdAt');
        this.field('updatedAt');
        this.field('isReply');
        this.field('isAI');
      });
    }
  }

  async saveIndex() {
    const indexPath = path.join(this.pilePath, this.indexFileName);
    fs.writeFileSync(indexPath, JSON.stringify(this.index));
  }

  query(searchTerm) {
    return this.index.search(searchTerm);
  }
}

module.exports = new PileSearchIndex();
