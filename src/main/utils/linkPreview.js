const axiosBase = require('axios');
const cheerio = require('cheerio');

const axios = axiosBase.create({
  timeout: 5000,
  maxContentLength: 5 * 1024 * 1024, // 5MB
  maxBodyLength: 10 * 1024 * 1024, // 10MB
});

// Setting the headers directly on the instance
axios.defaults.headers.common['User-Agent'] = 'Pile/1.0';
axios.defaults.headers.post['Content-Type'] = 'application/json';

export const getLinkPreview = async (url) => {
  try {
    const response = await axios
      .get(url, {
        headers: {
          Accept: 'text/html',
        },
      })
      .then((response) => {
        const contentType = response.headers['content-type'];
        if (contentType && contentType.includes('text/html')) {
          return response;
        }
        throw new Error('Not an HTML content');
      });

    const html = response.data;
    const $ = cheerio.load(html);
    const parsedUrl = new URL(url);

    let meta = {
      title: '',
      images: [],
      host: parsedUrl.host, // Extract the host domain from the URL
      favicon: '', // Initialize favicon with an empty string
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

    // Extract the favicon
    $('link').each((index, element) => {
      const rel = $(element).attr('rel')?.toLowerCase();
      const href = $(element).attr('href');
      if (rel && (rel.includes('icon') || rel === 'shortcut icon') && href) {
        // Resolve the favicon URL relative to the host URL
        meta.favicon = new URL(href, parsedUrl.origin).href;
        return false; // Break out of the loop after finding the favicon
      }
    });

    // If no favicon is found in the loop, you can set a default path
    if (!meta.favicon) {
      meta.favicon = parsedUrl.origin + '/favicon.ico';
    }

    return meta;
  } catch (error) {
    console.error(error);
    return null;
  }
};
