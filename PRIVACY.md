# Privacy Policy

## No Query Logging

The IT Quality MCP server does **not** log, store, or transmit user queries. All tool calls are processed statelessly and discarded after the response is returned.

## Stateless Server

The server is a read-only SQLite database with no user accounts, sessions, or persistent state. There is no authentication required and no user data is collected.

## Local Option

You can run the MCP server entirely locally via npm:

```bash
npx @ansvar/it-quality-mcp
```

When running locally, all processing happens on your machine. No data leaves your environment.

## Remote (Vercel)

When using the remote Streamable HTTP endpoint hosted on Vercel, your MCP tool call requests are processed by Vercel's serverless infrastructure. Vercel may collect standard infrastructure logs (IP addresses, request metadata) per their [privacy policy](https://vercel.com/legal/privacy-policy). The IT Quality MCP application layer does not add any additional logging or tracking.

## No Cookies, Analytics, or Tracking

This MCP server uses:
- No cookies
- No analytics
- No tracking pixels
- No third-party scripts
- No telemetry
