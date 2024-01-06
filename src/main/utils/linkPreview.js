const axiosBase = require('axios');
const cheerio = require('cheerio');

const axios = axiosBase.create({
  timeout: 5000,
  maxContentLength: 5 * 1024 * 1024, // 5MB
  maxBodyLength: 10 * 1024 * 1024, // 10MB
});

// Setting the headers directly on the instance
axios.defaults.headers.common['User-Agent'] = 'Mozilla/5.0 Pile/1.0';
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
        console.log('Not HTML/Text content', contentType);
        if (contentType && contentType.includes('text/html')) {
          return response;
        }
        throw new Error('Not HTML/Text content');
      });

    const html = response.data;
    const $ = cheerio.load(html);
    const parsedUrl = new URL(url);

    let meta = {
      title: '',
      images: [],
      host: parsedUrl.host,
      favicon: '',
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
        return false;
      }
    });

    return meta;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const getContentHeuristics = (html) => {
  const $ = cheerio.load(html);
  let maxDensity = 0;
  let mainContent = '';

  $('*').each(function () {
    const text = $(this).clone().children().remove().end().text();
    const wordCount = text.split(/\s+/).length;
    const density = wordCount / $(this).text().length;

    // Check if the element has a higher text density and
    // contains more words than the current max.
    // 200 is arbitrary
    if (density > maxDensity && wordCount > 200) {
      maxDensity = density;
      mainContent = text;
    }
  });

  return mainContent.trim().replace(/\s\s+/g, ' ');
};

export const getLinkContent = async (url) => {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Some content we want to filter out
    $(
      'script, style, iframe, noscript, nav, header, footer, .nav, .menu, .footer'
    ).remove();

    let contentSections = [];

    // Targets likely to hold main text content
    const sectionSelectors = 'div, section, article, main, [role="main"]';

    $(sectionSelectors).each(function () {
      const sectionText = $(this).text().trim();
      const textLength = sectionText.replace(/\s+/g, ' ').length;

      // If the section contains a significant amount of text, consider it as content
      if (textLength > 200) {
        contentSections.push({
          html: $(this).html(), // Keep the HTML to preserve images and links
          textLength: textLength,
        });
      }
    });

    // Sort sections by text length, descending
    contentSections.sort((a, b) => b.textLength - a.textLength);

    // Concatenate the HTML of the top sections to form the main content.
    // Adjust the number of sections as needed,
    // 3 does well enough for most websites
    let mainContentHtml = contentSections
      .slice(0, 3)
      .map((section) => section.html)
      .join(' ');

    // Load the concatenated HTML into Cheerio for final cleaning
    const mainContent = cheerio.load(mainContentHtml);

    // Extract the clean text content
    const textContent = mainContent.text().replace(/\s+/g, ' ').trim();

    // Extract image sources
    const imageSources = mainContent('img')
      .map((i, el) => mainContent(el).attr('src'))
      .get();

    // Extract links
    const links = mainContent('a')
      .map((i, el) => ({
        href: mainContent(el).attr('href'),
        text: mainContent(el).text().trim(),
      }))
      .get();

    return {
      text: textContent,
      images: imageSources.slice(0, 10),
      links: links.slice(0, 10),
    };
  } catch (error) {
    console.error(error);
    return null;
  }
};
