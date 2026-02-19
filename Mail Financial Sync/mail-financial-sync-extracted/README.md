# Mail Financial Sync

Mail Financial Sync connects to Gmail and builds an estimated monthly view of income and expenses from financial notification emails.

## Run Locally

Prerequisites:
- Node.js `>=18.18.0`

Steps:
1. Install dependencies:
   `npm install`
2. Configure environment:
   `.env.example`
   - Create `.env.local`
   - Set `VITE_GOOGLE_CLIENT_ID=<your_web_oauth_client_id>`
3. Start the app:
   `npm run dev`

## Google OAuth Setup

1. In Google Cloud Console, create an OAuth 2.0 Client ID of type **Web application**.
2. Add authorized JavaScript origins for your environments.
3. Enable the **Gmail API** for the project.
4. Use scope `https://www.googleapis.com/auth/gmail.readonly`.

## Quality Checks

- Type check: `npm run typecheck`
- Tests: `npm run test`
- Full check: `npm run check`
