# @periodix/n8n-nodes-actions

This is the **Periodix Actions** community node for n8n. It lets you run safe, rate-limited LinkedIn searches — Classic and Sales Navigator, People / Companies / Posts / Jobs — straight from your workflows by pasting a search URL.

[Periodix Actions](https://actions.periodix.net) is a multi-tenant API for sales-automation primitives. It handles LinkedIn account connection, rate limiting, and pacing on your behalf, so your workflows don't have to.

[Installation](#installation)
[Features](#features)
[Credentials](#credentials)
[Node Operations](#node-operations)
[Usage](#usage)
[Example Workflow](#example-workflow)
[Compatibility](#compatibility)
[Resources](#resources)
[Version history](#version-history)

## Installation

### Community Nodes (recommended)

1. In n8n, go to **Settings → Community Nodes**.
2. Click **Install**.
3. Enter `@periodix/n8n-nodes-actions` and click **Download**.
4. The **Periodix LinkedIn Search** node will appear in your node palette.

### Self-hosted / manual

Run `npm install @periodix/n8n-nodes-actions` inside your n8n installation, then restart n8n.

See the official [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) for full details.

## Features

- **LinkedIn search by URL** — paste any LinkedIn Classic or Sales Navigator search URL; the node returns matching results.
- **Multiple result types** — People, Companies, Posts, Jobs (Classic); People, Companies (Sales Navigator).
- **Managed profile connection** — connect LinkedIn accounts in the Periodix Actions dashboard with a hosted auth flow; no cookies or credentials in n8n.
- **Built-in rate limiting** — Periodix paces calls per profile so you stay within LinkedIn's limits.
- **Async-by-design** — searches run in the background and resume the workflow via webhook when results are ready.

## Credentials

Steps to obtain the **API key** needed for authentication:

1. Go to [actions.periodix.net](https://actions.periodix.net) and sign in (or create an account).
2. Open the **Profiles** page and connect at least one LinkedIn account using the hosted auth flow.
3. Open the **API keys** page and click **New API key**.
4. **Copy** the generated key.
5. In n8n, create a new **Periodix Actions API** credential.
6. **Paste** the API key into the **Access Token** field and save.

API keys are scoped to a single organization and can be revoked from the dashboard at any time.

## Node Operations

### Periodix LinkedIn Search

Run a LinkedIn search by URL and return the matched items.

- **Profile** — the connected LinkedIn profile to run the search from (loaded from your Periodix Actions account).
- **Search URL** — a fully-qualified LinkedIn search URL. Supported:
  - LinkedIn Classic: [People](https://www.linkedin.com/search/results/people/), [Companies](https://www.linkedin.com/search/results/companies/), [Posts](https://www.linkedin.com/search/results/content/), [Jobs](https://www.linkedin.com/search/results/jobs/).
  - LinkedIn Sales Navigator: [People](https://www.linkedin.com/sales/search/people), [Companies](https://www.linkedin.com/sales/search/company).
- **Limit** — maximum number of results to return.
- **Options → Timeout (Minutes)** *(advanced)* — how long to wait for the search to finish before giving up.

The result shape (fields per item) varies with the search type and surface.

## Usage

**One input item per execution.** The node processes a single input item and waits (via webhook) for the search to complete — searches typically take minutes depending on result size and LinkedIn pacing.

**Profile connection status.** The profile dropdown shows a status indicator next to each connected LinkedIn profile. If the chosen profile is not in a connected state at execution time, the search will fail; reconnect it from the Periodix Actions dashboard.

New to n8n? See the [Try it out](https://docs.n8n.io/try-it-out/) guide.

## Example Workflow

### Scrape a Sales Navigator search into a Google Sheet

1. Add a **Manual Trigger** (or any trigger of your choice).
2. Add the **Periodix LinkedIn Search** node.
3. Pick a connected **Profile**.
4. Paste a Sales Navigator search URL into **Search URL** (e.g. `https://www.linkedin.com/sales/search/people?...`).
5. Set **Limit** to the number of results you want.
6. Connect a **Google Sheets → Append Row** node downstream, mapping the fields you need.
7. Execute the workflow. The node will wait for Periodix to complete the search, then emit one item per result.

## Resources

- [Periodix Actions](https://actions.periodix.net)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
