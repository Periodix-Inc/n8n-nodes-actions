# @periodix/n8n-nodes-actions

This is the **Periodix Actions** community node package for n8n. It lets you pull LinkedIn data — search results, full profiles, company profiles, posts, post comments and reactions, and connections — straight from your workflows, using safe, rate-limited calls through a connected LinkedIn account.

[Periodix Actions](https://actions.periodix.net) is a multi-tenant API for sales-automation primitives. It handles LinkedIn account connection, rate limiting, and pacing on your behalf, so your workflows don't have to.

[Installation](#installation)
[Features](#features)
[Credentials](#credentials)
[Nodes](#nodes)
[Usage](#usage)
[Example Workflow](#example-workflow)
[Resources](#resources)
[Version history](#version-history)

## Installation

### Community Nodes (recommended)

1. In n8n, go to **Settings → Community Nodes**.
2. Click **Install**.
3. Enter `@periodix/n8n-nodes-actions` and click **Download**.
4. The **Periodix LinkedIn** nodes will appear in your node palette.

### Self-hosted / manual

Run `npm install @periodix/n8n-nodes-actions` inside your n8n installation, then restart n8n.

See the official [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) for full details.

## Features

- **Search by URL** — paste any LinkedIn Classic or Sales Navigator search URL and get back matching People, Companies, Posts, or Jobs.
- **Profile & company enrichment** — fetch a full person profile (experience, education, skills, summary) or a company profile (industry, size, locations) by identifier.
- **Engagement & content** — list a person's or company's recent posts, and the comments and reactions on any post, to find and qualify warm leads.
- **Network** — list the 1st-degree connections of a connected account.
- **Managed profile connection** — connect LinkedIn accounts in the Periodix Actions dashboard with a hosted auth flow; no cookies or credentials in n8n.
- **Built-in rate limiting** — Periodix paces calls per profile so you stay within LinkedIn's limits.

## Credentials

Steps to obtain the **API key** needed for authentication:

1. Go to [actions.periodix.net](https://actions.periodix.net) and sign in (or create an account).
2. Open the **Profiles** page and connect at least one LinkedIn account using the hosted auth flow.
3. Open the **API keys** page and click **New API key**.
4. **Copy** the generated key.
5. In n8n, create a new **Periodix Actions API** credential.
6. **Paste** the API key into the **API Key** field and save.

API keys can be revoked from the dashboard at any time.

Every node requires this credential and a connected LinkedIn **Profile**, chosen from a dropdown that loads the profiles on your account. The dropdown shows each profile's connection status; if the chosen profile is not connected at execution time, the call fails — reconnect it from the dashboard.

## Nodes

### Periodix LinkedIn & Sales Navigator Search

Run a LinkedIn search by URL and return the matched items. *Asynchronous* — see [Usage](#usage).

- **Profile** — the connected LinkedIn profile to run the search from.
- **Search URL** — a fully-qualified LinkedIn search URL. Supported:
  - LinkedIn Classic: [People](https://www.linkedin.com/search/results/people/), [Companies](https://www.linkedin.com/search/results/companies/), [Posts](https://www.linkedin.com/search/results/content/), [Jobs](https://www.linkedin.com/search/results/jobs/).
  - LinkedIn Sales Navigator: [People](https://www.linkedin.com/sales/search/people), [Companies](https://www.linkedin.com/sales/search/company).
- **Limit** — maximum number of results to return.
- **Options → Timeout (Minutes)** *(advanced)* — how long to wait for the search to finish before giving up.

### Periodix LinkedIn Get Profile

Fetch a full LinkedIn profile (experience, education, skills, summary).

- **Person** — the public identifier (the part after `/in/` in the profile URL, e.g. `john-doe`) or the internal ID (e.g. `ACoAA…`) of the person.
- **Options → Notify Person** — whether to let the person see that you viewed their profile (default off).

### Periodix LinkedIn Get Company Profile

Fetch a LinkedIn company profile (industry, size, description, locations).

- **Company** — the public identifier (the part after `/company/`), numeric company ID, or URN.

### Periodix LinkedIn Get User Posts

List the recent posts published by a person or company. Emits one item per post.

- **Author ID** — the author's internal ID. For a person it starts with `ACo`/`ADo`; for a company use the numeric company ID and enable **Is Company**.
- **Is Company** — whether the author is a company rather than a person.
- **Return All** / **Limit** — return everything, or cap the number of posts.

### Periodix LinkedIn Get Post Comments

List the comments on a post, with author details. Emits one item per comment.

- **Post Social ID** — the post's `social_id` (returned by **Get User Posts**), not the numeric ID in the post URL.
- **Return All** / **Limit**.

### Periodix LinkedIn Get Post Reactions

List the people who reacted to a post (or to a specific comment). Emits one item per reaction.

- **Post Social ID** — the post's `social_id` (returned by **Get User Posts**).
- **Options → Comment ID** — fetch reactions on a specific comment instead of the post.
- **Return All** / **Limit**.

### Periodix LinkedIn Get Connections

List the 1st-degree connections of the connected account. Emits one item per connection.

- **Return All** / **Limit**.

## Usage

**Search is asynchronous.** The Search node processes a single input item and waits (via webhook) for the search to complete — searches typically take minutes depending on result size and LinkedIn pacing.

**The other nodes are synchronous.** They return immediately, process every input item, and emit one output item per result. The list nodes (User Posts, Post Comments, Post Reactions, Connections) paginate automatically: turn on **Return All** to fetch everything, or leave it off and set a **Limit**.

**Post IDs.** Comments and reactions are keyed by a post's `social_id`, which you get from **Get User Posts** — the numeric ID in a post's URL will not work.

New to n8n? See the [Try it out](https://docs.n8n.io/try-it-out/) guide.

## Example Workflow

### Find and enrich engaged leads from a post

1. Add a **Manual Trigger** (or any trigger).
2. Add **Periodix LinkedIn Get User Posts**, pick a connected **Profile**, and enter the author's **Author ID** to find a relevant post; note its `social_id`.
3. Add **Periodix LinkedIn Get Post Comments** (or **Get Post Reactions**) and pass that `social_id` as the **Post Social ID** to list everyone who engaged.
4. Add **Periodix LinkedIn Get Profile** to enrich each commenter/reactor into a full profile.
5. Connect a **Google Sheets → Append Row** node downstream, mapping the fields you need.

## Version history

See [CHANGELOG.md](CHANGELOG.md) for the full release history.

## Resources

- [Periodix Actions](https://actions.periodix.net)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
