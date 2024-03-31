const cheerio = require('cheerio');
// const fetch = require('node-fetch');
const fs = require('fs');

class LinkExtractor {
    constructor() {
        this.baseUrl = 'https://html.duckduckgo.com/html?q=rich%20dad%20poor%20dad%20filetype%20pdf';
    }

    async fetchData(page = 1) {
        const url = `${this.baseUrl}&p=${page}`;
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/html',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0 Firefox/121.0',
                    'Accept-Encoding': 'gzip, deflate',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Cache-Control': 'no-cache'
                },
                accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                "user-agent": 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch page ${page}: ${response.statusText}`);
            }
            const data = await response.text();
            fs.writeFileSync('temp1.html', data);
            const extractedLinks = await this.extractLinks(data);
            console.log(`Links from page ${page}:`, extractedLinks);
            return extractedLinks;
        } catch (error) {
            console.error('Error fetching data:', error);
            return [];
        }
    }

    async extractLinks(data) {
        const $ = cheerio.load(data);
        let links = [];
        $('a.result__url').each((index, element) => {
            const e = $(element).attr('href');
            links.push(e);
        });
        const decodedLinks = links.map(link => {
            const uddgIndex = link.indexOf('uddg=');
            if (uddgIndex !== -1) {
                const encodedUrl = link.substring(uddgIndex + 5);
                const decodedUrl = decodeURIComponent(encodedUrl);
                return decodedUrl;
            }
            return null;
        });
        const filteredLinks = decodedLinks.filter(link => {
            return link.includes('.pdf') && !link.includes('drive.google.com');
        });

        // Check the status of each link
        const validatedLinks = await Promise.all(filteredLinks.map(async link => {
            try {
                const response = await fetch(link);
                if (response.ok) {
                    return link; // Add the link if response status is OK
                } else {
                    return null; // Skip adding the link if response status is not OK
                }
            } catch (error) {
                // console.error(`Error fetching ${link}:`, error);
                // console.log("error here");
                return null; // Skip adding the link in case of any error
            }
        }));

        // Filter out null links
        return validatedLinks.filter(link => link !== null);
    }

    async fetchAllPages(numPages) {
        let allLinks = [];
        for (let page = 1; page <= numPages; page++) {
            const links = await this.fetchData(page);
            allLinks = allLinks.concat(links);
        }

        // Return all links once all pages are processed
        return allLinks;
    }
}

const linkExtractor = new LinkExtractor();
linkExtractor.fetchAllPages(3)
    .then(allLinks => {
        console.log('All links:', allLinks);
    })
    .catch(error => {
        console.error('Error:', error);
    });
