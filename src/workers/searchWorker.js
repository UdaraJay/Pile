const fs = require('fs');

self.addEventListener(
  'message',
  function (e) {
    var file = e.data.file;
    var term = e.data.term;

    fs.readFile(file, 'utf8', (err, data) => {
      if (err) {
        console.error('Error:', err);
        return;
      }

      var json = JSON.parse(data);
      var results = searchInObject(json, term);
      self.postMessage(results);
    });
  },
  false
);

function searchInObject(obj, term) {
  var results = [];
  for (var key in obj) {
    if (typeof obj[key] === 'object') {
      results = results.concat(searchInObject(obj[key], term));
    } else if (typeof obj[key] === 'string' && obj[key].includes(term)) {
      results.push(obj);
    }
  }
  return results;
}
