---
name: convex-firecrawl-scrape
description: Scrape any URL and get clean markdown, HTML, screenshots, or structured JSON - with durable caching and reactive queries. Use this skill whenever working with Firecrawl Scrape or related Convex component functionality.
---

# Firecrawl Scrape

## Instructions

This component provides a durable web scraping service that extracts content from URLs and returns clean markdown, HTML, screenshots, or structured JSON data. Built on Firecrawl's scraping API, it features intelligent caching with configurable TTL, reactive status updates via Convex subscriptions, and built-in SSRF protection. The component handles async scraping jobs and stores results in your Convex database for reliable access.

### Installation

```bash
npm install convex-firecrawl-scrape
```

## Use cases

• **Content aggregation apps** that need to scrape blog posts, news articles, or documentation sites and convert them to clean markdown for display or processing
• **Product monitoring dashboards** that extract structured data from e-commerce pages using JSON schemas to track pricing, availability, and product details
• **Research tools** that capture screenshots and full HTML content from web pages for archival, comparison, or analysis workflows
• **AI training pipelines** that need to scrape and clean web content at scale, with durable caching to avoid re-scraping the same URLs
• **Competitive intelligence platforms** that monitor competitor websites and extract specific data points using schema-based extraction

## How it works

The component wraps Firecrawl's scraping API in Convex actions and provides a secure `exposeApi()` function that enforces authentication before any scraping operation. When you call `scrape()`, it starts an async job and returns a job ID that you can use with `useQuery()` to reactively monitor status updates.

Scraped content gets cached in your Convex database with a configurable TTL (default 30 days) and uses superset matching where cached results with multiple formats can satisfy requests for fewer formats. The component supports multiple output formats including markdown, HTML, screenshots, and AI-generated summaries, plus structured JSON extraction via schema validation.

All scraping operations include built-in SSRF protection that blocks private IPs and localhost, and the required auth wrapper ensures your Firecrawl API key stays secure. You can configure proxy options for anti-bot protection and set wait times for dynamic content rendering.

## When NOT to use

- When a simpler built-in solution exists for your specific use case
- If you are not using Convex as your backend
- When the functionality provided by Firecrawl Scrape is not needed

## Resources

- [npm package](https://www.npmjs.com/package/convex-firecrawl-scrape)
- [GitHub repository](https://github.com/Gitmaxd/convex-firecrawl-scrape)
- [Live demo](https://convex-firecrawl-scrape.vercel.app/)
- [Convex Components Directory](https://www.convex.dev/components/firecrawl-scrape)
- [Convex documentation](https://docs.convex.dev)