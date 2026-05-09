# LoginRegister App

A Shopify embedded app for customer login and registration, built to work alongside the existing Review, COD Restrictions, and Store Locator apps using a unified PostgreSQL database.

## Features

- Customer registration with email/password
- Customer login
- Admin dashboard to view registered customers
- Toggle settings (registration, social login, email verification)
- Embeddable login/register widget for Shopify themes
- Shared database with other apps (Review, COD, Store Locator)

## Tech Stack

- Next.js 14 (App Router)
- Prisma ORM
- PostgreSQL
- Tailwind CSS
- Shopify App Bridge
- bcryptjs for password hashing

## Installation

1. Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Generate Prisma client and push schema:
   ```bash
   npm run db:generate
   npm run db:push
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

## Shopify App Setup

1. Create a new app in your Shopify Partner Dashboard
2. Set the App URL to your deployed app URL
3. Set the Allowed redirection URL(s) to: `https://your-app-domain.com/api/shopify/callback`
4. Copy the API Key and API Secret to your `.env`
5. Install the app on a development store via `/install?shop=your-store.myshopify.com`

## Theme Integration

Add the embed widget to your Shopify theme by including an iframe pointing to:
```
https://your-app-domain.com/embed?shop=your-store.myshopify.com
```

Or use the provided theme snippets in the `theme_export` folder.

## Database

This app shares the same unified PostgreSQL database as:
- `review-app`
- `cod-restrictions-app`
- `storelocator-app`

The Prisma schema includes models for all four apps. Ensure `DATABASE_URL` points to the same database used by the other apps.

## License

Private - For internal use only.
