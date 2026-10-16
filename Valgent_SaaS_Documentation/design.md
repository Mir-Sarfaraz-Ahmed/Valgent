# Valgent — Design System & Page Specification

**Visual direction:** use the **first generated four-screen mockup** at `reference/valgent-first-mockup.png`. Keep its soft abstract waves, airy cards, rounded geometry and coral/plum gradients, combined with the provided burgundy-to-peach palette.

## 1. Brand and design principles

- **Evidence before hype:** labels and states must tell users what the system checked, what it found, and what is still unknown.
- **Soft, polished SaaS:** creamy background, translucent surfaces, gentle gradients and restrained blur. Keep code/report views readable rather than overly decorative.
- **Clear hierarchy:** a short page headline, one primary action, visible project context, compact status chips, readable source references.
- **Honest UI:** never bake demo figures, fake completed steps, or fabricated claims into production screens.
- **No dead UI:** all visible buttons must work or be clearly disabled with a reason. Do not create Settings or upgrade controls for this scope.

## 2. Color palette

Use the supplied palette as the base:

| Token | Hex | Use |
|---|---|---|
| `--color-peach` | `#FFBB94` | Soft warm highlights and background glow. |
| `--color-coral` | `#FB9590` | Primary CTA start, upload accents, focus rings. |
| `--color-rose` | `#DC586D` | Main status/action accent and gradient midtone. |
| `--color-wine` | `#A33757` | Strong CTA gradient and active navigation. |
| `--color-berry` | `#852E4E` | Secondary emphasis and hover states. |
| `--color-plum` | `#4C1D3D` | Headings, icons, dark text and high-emphasis surfaces. |

Suggested support tokens:

```css
:root {
  --color-peach: #FFBB94;
  --color-coral: #FB9590;
  --color-rose: #DC586D;
  --color-wine: #A33757;
  --color-berry: #852E4E;
  --color-plum: #4C1D3D;

  --surface-page: #FFF9F8;
  --surface-card: rgba(255, 255, 255, 0.72);
  --surface-card-strong: rgba(255, 255, 255, 0.88);
  --border-soft: rgba(132, 46, 78, 0.14);
  --text-primary: #32152D;
  --text-secondary: #746371;
  --text-muted: #958794;
  --status-verified: #16835F;
  --status-verified-bg: #E0F6EC;
  --status-partial: #A85B10;
  --status-partial-bg: #FFF0D9;
  --status-not-verified: #BB2947;
  --status-not-verified-bg: #FFE5EA;
  --status-insufficient: #6D6471;
  --status-insufficient-bg: #F0ECF2;
  --radius-card: 20px;
  --radius-control: 12px;
  --shadow-card: 0 16px 42px rgba(76, 29, 61, 0.08);
}
```

Status colors are semantic accents only. Do not rely on color alone; each status includes text and an icon/shape.

## 3. Typography

- Use **Inter** for UI, body, tables and form controls.
- Use **Urbanist** for the larger landing headline and selected feature headings if it matches the first mockup.
- Headings: 600–700 weight. Body: 400–500. Buttons: 500–600.
- Landing hero desktop: about 56–64 px headline; tablet 44–48 px; mobile 34–38 px.
- Workspace page title: 28–34 px. Card headings: 16–20 px. Body/table content: 13–15 px minimum for dense content.
- Use tabular numerals for durations/counts; long file paths should wrap or truncate with a tooltip/copy action.

## 4. Layout and surfaces

- Desktop application shell: left sidebar about 220–260 px; main content uses flexible columns and 24–32 px page padding.
- Main canvas: light warm gradient with subtle abstract line/wave art at low contrast. Decoration must not reduce chart/table contrast.
- Glass cards: translucent white fill, 1 px soft border, 16–22 px radius, low shadow. Blur should be restrained for performance and readability.
- Use an 8 px spacing rhythm. Align card edges and action buttons consistently.
- Primary action: coral → rose → wine gradient with white text; use for Sign up, New project, Analyze/Recheck, Generate report.
- Secondary action: transparent/light card with plum text and a soft border.
- Destructive actions: explicit confirmation and separate visual treatment; do not disguise as the primary action.

## 5. Page 1 — Landing

**Goal:** explain Valgent quickly and lead visitors to create an account.

- Header: Valgent mark/name at left; minimal links such as Features, How it works, Security; Log in and Sign up at right.
- Hero headline: “Know what’s built. See what’s next.”
- Supporting copy: “Validate project claims against real repository evidence and get actionable insights for what to build next.”
- Primary CTA: **Get started free** → `/signup`.
- Secondary CTA: **Explore workflow** → scroll to/how it works section.
- Right-side illustration: abstract evidence/repository flow, not a fake live metric.
- Bottom feature row: Repository analysis, Evidence-backed claims, Safe sandbox checks, Actionable roadmap.
- Do not present “20k+”, user counts, accuracy percentages, or savings as real facts unless measured and substantiated.

## 6. Page 2 — Sign up / Log in

- Calm centered auth card over the same warm abstract gradient.
- Fields: full name (sign-up only), email, password; visible validation, password visibility toggle, submit loading/error states.
- Secondary provider option (e.g. GitHub) only after that OAuth provider is truly configured.
- Links between Sign up and Log in.
- Accessible labels and errors; avoid placeholder-only labels.
- After signup, show the account identity from the auth provider. Never hard-code “Shadab” into the header or sample account data.

## 7. Page 3 — Projects dashboard

- Workspace shell with the Valgent brand and product navigation. Overview or Projects may be highlighted according to product route; the current page is clearly named **Your projects**.
- Top area: title, concise helper text, **New project** CTA, project search, and filters (All, In progress, Needs review, Completed).
- Each project row/card: project name, optional short description, repository owner/name, branch/commit, last analysis timestamp, real current state, Open workspace, Recheck.
- Empty state: a friendly “Add your first project” card with a New project action.
- **Do not render a Free plan / Upgrade / promotional box in the lower-left sidebar. Leave that sidebar area empty.** Do not show billing-related content.
- Do not show a fake user name in the top-right header. A minimal avatar/profile control may appear after authentication.

## 8. Page 4 — Project workspace

The workspace belongs to one project and uses the shared application shell. The left sidebar must contain exactly:

1. Overview
2. Evidence graph
3. Reports
4. Roadmap

No Settings item. Keep the lower sidebar clean; do not add an upgrade card.

### Overview

- Project name and repository context; branch/commit display or selection.
- Repository URL and **Analyze / Recheck project** primary action.
- Full-width upload zone labelled **Upload requirements or planned files**, with accepted formats only when the corresponding parser is implemented.
- Analysis progress tracker using actual pipeline metadata.
- Summary cards for claim totals and status totals. Counts come from the selected completed/latest run; never from design mockup constants.
- Claim table: claim, evidence reference(s), status, concise reason, open detail affordance.
- Execution roadmap preview on the right, based on actual tasks, with View full.
- Report CTA becomes enabled only after a real report is available.

### Evidence graph

- Node categories: claim, requirement, evidence, code symbol, route, database operation, execution result, where available.
- Filters/search by claim, node type, source file, status.
- Selecting a node opens a detail panel with exact source path/line data, metadata and connected nodes.
- Provide an accessible list/table alternative to graph visualization.

### Reports

- List analysis runs with commit, time, status, provider/degraded state, and counts.
- Open full report, download JSON, or copy JSON.
- Keep prior reports when Recheck creates a new run.
- Mark LLM/provider failure and incomplete verification prominently; do not hide it behind a green completion badge.

### Roadmap

- Each task: title, why it matters, evidence references, recommended actions, dependency/prerequisite, status, acceptance criteria.
- If a field is not in the backend data, hide it or show “Not available”; do not invent dependencies, owners, effort, or priorities.
- Completion status updates should be persisted if interactive task management is implemented; otherwise render as read-only recommendations.

## 9. Interaction patterns

- Buttons and inputs need visible hover, focus, active, disabled, loading, error and success states.
- Analysis state must be derived from the API, not a CSS animation alone.
- Show confirm dialog before deleting a project or performing any destructive operation.
- File upload: drag-and-drop and Choose files; display filename, size, type, progress, parse result and remove action.
- Recheck should show the commit being checked and create a new analysis record.
- Provide tooltips for technical terms without making the dashboard feel like a chatbot.

## 10. Responsive behavior

- `>= 1280px`: full sidebar, two-column workspace (analysis left, roadmap right), upload row across main content.
- `1024–1279px`: reduce page padding and card gaps; roadmap below main analysis if needed.
- `768–1023px`: collapsible sidebar, single-column project workspace, compact top nav.
- `< 768px`: mobile nav drawer, one-column cards, horizontal scroll or stacked claim rows, full-width CTAs.
- `< 480px`: reduce decorative waves/blur; never shrink core table text below comfortable readability—switch dense tables into stacked claim cards instead.
- Respect `prefers-reduced-motion`; no animation should be required to understand the interface.

## 11. Accessibility

- Semantic headings/landmarks and a skip-to-content link.
- Keyboard-accessible sidebar, dialogs, drop zone, table actions and graph alternative.
- Focus indicators with sufficient contrast.
- Labels and field-level error messages for forms.
- Status meaning uses text plus icon; not color alone.
- Add text summary of pipeline and graph for screen readers.
- Ensure glass backgrounds do not cause low-contrast text.

## 12. Assets and design files

- `reference/valgent-first-mockup.png` is the first four-screen mockup and visual inspiration only.
- Create actual UI using DOM/CSS/SVG components so content and controls remain accessible and responsive. Do not use the mockup image as a full-page background or as a substitute for working frontend components.

## 13. Backend-backed interface rules

- Use the first generated four-screen mockup as the visual baseline and build real DOM/CSS/SVG components rather than using the image as a page background.
- Top-right account control must never hard-code “Shadab”: show the authenticated user’s account name/avatar only after the auth session resolves.
- Projects dashboard has no Free Plan / Upgrade / promotional card in the lower-left sidebar. Keep that area blank/clean.
- Workspace sidebar contains exactly Overview, Evidence graph, Reports and Roadmap. Do not show Settings.
- Project cards, claim totals, evidence coverage, timestamps and roadmap tasks come from the API. Show skeletons and honest empty states while data is missing.
- Run status is separate from claim status. Enable report export only when a valid persisted report exists.
- Upload states are Uploaded, Parsing, Ready and Failed; advertise only formats with implemented parsers.
- Progress is backed by worker state; animation alone must not imply real analysis has occurred.
