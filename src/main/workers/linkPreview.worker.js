const { parentPort } = require('worker_threads');
const axiosBase = require('axios');
const cheerio = require('cheerio');

// Some sensible settings to make this more reliable and secure
const axios = axiosBase.create({
  timeout: 5000,
  maxContentLength: 5 * 1024 * 1024, // 5MB
  maxBodyLength: 10 * 1024 * 1024, // 10MB
});
axiosBase.defaults.headers.common['User-Agent'] = 'Pile/1.0';
axiosBase.defaults.headers.post['Content-Type'] = 'application/json';
delete axios.defaults.headers.common['Referer'];

async function fetchAndParseMetaTags(url) {
  try {
    const response = await axios
      .get(url, {
        headers: {
          Accept: 'text/html',
        },
      })
      .then((response) => {
        const contentType = response.headers['content-type'];
        if (contentType.includes('text/html')) {
          return response;
        }
      });

    const html = response.data;
    const $ = cheerio.load(html);

    let meta = {
      title: '',
      images: [],
    };

    // Extract the title
    const title = $('title').first().text();
    meta.title = title;

    // Extract the Open Graph images
    $('meta').each((index, element) => {
      const property = $(element).attr('property');
      const content = $(element).attr('content');

      if (property === 'og:image') {
        meta.images.push(content);
      }
    });

    return meta;
  } catch (error) {
    return null;
  }
}

parentPort.on('message', async (url) => {
  try {
    const metaInfo = await fetchAndParseMetaTags(url);
    parentPort.postMessage({ metaInfo });
  } catch (error) {
    parentPort.postMessage({ error: error.message });
  }
});
