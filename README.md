# ImpactTrail AI

ImpactTrail AI is a proof of concept for recording contributions, connecting them to measurable milestones, and sharing evidence-backed outcomes with a direct manager. Studio North, its employees, and every seeded record are fictional.

## Run locally

Use Node.js 22 or later. The project has no external dependencies.

```sh
npm test
npm start
```

Open **http://127.0.0.1:8765**. Set the `PORT` environment variable if that port is in use. The static app needs an HTTP server when run from this source folder.

## Try the demo in five minutes

1. In **Employee**, open **Contribution log** and filter to **Learning**. Open the affinity mapping entry to see the application, outcome, milestone, and timestamped evidence.
2. Select **Log contribution**. Record a fictional achievement or applied learning, link the onboarding pilot, and add an evidence reference. New contributions are private by default.
3. Switch to **Direct manager**. Open **Contribution log** and check that your new record is hidden. Switch back to **Employee**, open the new record, edit **Visibility** to **Shared**, and check that Jordan can now review it and its evidence. Change it to **Private** to revoke access in the demo.
4. In **Employee → Milestones**, open the onboarding pilot and update progress to 4 of 4 with status **Complete**. Open **Strategy** to see the milestone under its objective. Jordan’s **Overview** highlights milestones marked **At risk**.
5. Reload the page to verify browser-local persistence. Use **Reset demo** to restore the original fictional records.

## Scope and visibility

- Maya can create and edit contributions, evidence references, and milestones. Jordan can read shared records from Maya and Theo, who are Jordan’s direct reports. Strategy totals and dashboard counts use the same role-scoped data.
- Evidence is stored as text references with an automatic UTC timestamp. Each contribution also has an occurrence date and a separate UTC creation timestamp. Evidence follows the parent contribution’s visibility.
- The role switch simulates authorization. Both perspectives run in the same browser, and synthetic data is available in the source and browser storage. There are no accounts, server-side access controls, file uploads, or shared database. Use synthetic records only.
- Each colleague gets an independent copy of the demo. Their edits stay in their browser. If browser storage is disabled, edits last for the page session.
- The AI name is the product concept. The dashboard uses deterministic summaries over structured records. No AI service, API key, or network integration is required.

## Tests

Run `npm test` from the project folder. The suite checks direct-report scoping, evidence and count visibility on sharing and revocation, timestamp preservation, milestone validation, applied-learning validation, and blocked manager writes. The GitHub Actions workflow runs the same suite on pushes and pull requests.

## Publish to GitHub

In GitHub Desktop, add the local repository, sign in to GitHub, then select **Publish repository**. Choose the intended owner and repository visibility. A private repository can be shared by granting colleagues access. If starting from a ZIP, extract it and create a local Git repository first.

With a signed-in GitHub CLI, run this from the committed repository:

```sh
gh repo create impacttrail-ai --private --source=. --remote=origin --push
```

To share a browser URL, publish `index.html` and `assets/` together on a static host. For GitHub Pages, use a repository and plan that support Pages, and configure Pages to publish from the root of the `main` branch. Check the published site’s audience before sharing its URL. The app uses relative asset paths so it can run under a repository URL prefix.
