# Update Email

Email service integration and notification system for the VaultoAI platform. Part of VaultoAI's internal tooling.

## Overview

This Next.js application generates and sends daily market overview emails to configured recipients. It combines a TradingView market heatmap screenshot (via Puppeteer), prestock token performance data, and AI-generated market insights from Perplexity into a single HTML email sent through Resend. Scheduling is supported via Netlify cron or Vercel Cron. It is maintained by VaultoAI for internal and optional user-facing notifications.

## Features

- **Daily market overview email** — Scheduled send (e.g. 10 AM UTC) with heatmap, token performance, and AI insights
- **Preview and manual send** — API routes to generate preview or send to custom recipients
- **Resend integration** — Reliable email delivery
- **Perplexity integration** — AI-generated market commentary
- **Puppeteer** — Screenshot capture for heatmap inclusion

## Technology Stack

- **Languages:** TypeScript
- **Frameworks / libraries:** Next.js 14, React, Resend, Puppeteer, Netlify Functions

## Getting Started

### Prerequisites

- Node.js and npm
- Resend API key and Perplexity API key (see EMAIL_SETUP.md)

### Installation

```bash
npm install
```

### Running

1. Set environment variables (e.g. in `.env.local`): `RESEND_API_KEY`, `PERPLEXITY_API_KEY`; optional `EMAIL_FROM`, `EMAIL_FROM_NAME`, `CRON_SECRET`.
2. Run the development server:

```bash
npm run dev
```

3. Use `GET /api/email/market-overview` for preview, `POST /api/email/send` to send, or `GET /api/cron/send-daily-email` for the cron-triggered send (protect with `CRON_SECRET` in production).

## Configuration

See EMAIL_SETUP.md and NETLIFY_CRON_SETUP_PROMPT.md for Resend, Perplexity, cron, and deployment configuration.

## Contributing

See CONTRIBUTING.md for guidelines, or contact VaultoAI engineering.

## License

See LICENSE file.

## Contact

VaultoAI Engineering. For support or questions, see the repository or organization documentation.
