import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import axios from "axios";
import * as cheerio from "cheerio";
import { Task } from "../types/task";

chromium.use(stealth());
/**
 * Main browserService function
 * This function handles the task of searching and scraping web pages.
 */
async function browserService(task: Task): Promise<string> {
  try {
    let responseData: any;

    await searchAndScrape(JSON.parse(task.instruction).name, JSON.parse(task.instruction).noOfResponses).then((data) => {
      responseData = data;
    }).catch((error) => {
        responseData = { error: `Failed to scrape content: ${error.message}` };
    });


    return  JSON.stringify(responseData)
  } catch (error) {
    return `Error processing task: ${error.message}`
  }
}

/**
 * Check if input is a valid URL
 */
function isValidURL(input: string): boolean {
  try {
    new URL(input);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Perform a DuckDuckGo search
 */
async function performSearch(query: string, noOfResponses: number): Promise<any> {
  const searchURL = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await axios.get(searchURL);
  const $ = cheerio.load(response.data);

  let results: { title: string; link: string }[] = [];
  $("a.result__a").each((_, el) => {
    const title = $(el).text();
    let link = $(el).attr("href");

    if (link && link.startsWith("//duckduckgo.com/l/?uddg=")) {
      link = decodeURIComponent(link.split("uddg=")[1].split("&")[0]); // Extract clean link
    }

    if (link) results.push({ title, link });
  });

  return results.length > 0 ? results.slice(0, noOfResponses) : "No relevant results found.";
}

/**
 * Scrape a webpage using an existing Page object
 */
// Modified to accept an existing Playwright Page object
async function scrapeWebPage(page: import('playwright').Page, url: string): Promise<any> {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

      // Extract title, description, and main content
      const title = await page.title() || await page.$eval("h1", el => el.textContent?.trim()).catch(() => "No Title");
      const description = await page
        .$eval('meta[name="description"]', (el) => el.getAttribute("content"))
        .catch(() => "No Description");
  
      const content = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("p"))
          .map((p) => p.textContent?.trim())
          .filter((text) => text && text.length > 50)
          .join("\n\n");
      });

      // Do not close the browser here; it's managed externally
      return {
        title: title?.trim() || "No Title",
        description,
        content: content || "No readable content",
        source: url,
      };
    } catch (error) {
      // Do not close the browser here
      return { error: `Failed to scrape content for ${url}: ${error.message}` };
    }
    // No finally block needed to close page/browser here
}

/**
 * Extract meaningful content (filters out ads, navigation, etc.)
 */
function extractMainContent(document: Document): string {
  let paragraphs = document.querySelectorAll("p");
  let contentArray = Array.from(paragraphs)
    .map((p) => p.textContent?.trim())
    .filter((text) => text && text.length > 50);

  return contentArray.join("\n\n").substring(0, 5000);
}


async function searchAndScrape(query: string, noOfResponses: number = 5): Promise<any> {
    console.log(`🔍 Searching for: ${query}`);
    const searchResults = await performSearch(query, noOfResponses);
    
    if (searchResults.length === 0 || searchResults[0].error) {
      return { input: query, output: searchResults };
    }
  
    console.log(`✅ Found ${searchResults.length} results. Launching browser for scraping...`);

    // Launch a single browser instance for all scraping tasks
    const browser = await chromium.launch({ headless: true });
    try {
        const context = await browser.newContext(); // Use a context for better isolation

        const detailedResults = await Promise.all(
          searchResults.map(async (result) => {
            const page = await context.newPage(); // Create a new page for each task
            try {
                const scrapedData = await scrapeWebPage(page, result.link); // Pass the page object
                return { title: result.title, ...scrapedData };
            } finally {
                await page.close(); // Ensure page is closed even if scraping fails
            }
          })
        );
        return { input: query, output: detailedResults };
    } finally {
        await browser.close(); // Ensure browser is closed after all scraping is done
        console.log("Browser closed.");
    }
  }

export { browserService };
// const task1: Task = { input: "latest AI advancements" };
// browserService(task1).then(console.log); 
// // Returns a list of search results

// const task2: Task = { input: "https://openai.com/research/gpt-4" };
// browserService(task2).then(console.log); 
// // Returns structured content from the webpage
// let t:Task= { 
//     instruction: `{
//     "name" :"iphone 16 reviews", 
//     "noOfResponses": 5
//     }`,
// }

// browserService(t).then(console.log);
