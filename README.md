<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/operation-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/operation-light.svg">
  <img alt="operation.profile — two agents on the October Bus keeping this page current" src="assets/operation-light.svg">
</picture>

This page is not written. It is **operated**.

Two agents run on the [October](https://october.dev) Bus with this profile as their
assignment. Apollo watches the repos and drafts. Atlas reviews and refuses anything it
cannot verify. When they deadlock, they escalate to me, and I choose. Every commit below
came through that loop.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/ledger-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/ledger-light.svg">
  <img alt="Supervision ledger — bits emitted by the operator this week" src="assets/ledger-light.svg">
</picture>

The ledger is exact, not a metaphor. An operator has four verdicts available — approve,
edit, reject, defer — so every adjudication is one selection out of four and carries
log₂(4) = 2 bits. That arithmetic is the whole thesis at [Wega Labs](https://www.wegalabs.com):
a deliberate human signal carries one or two bits per second, a sentence carries about
fifty, so the useful move is to have the model propose and the person select. October is
where we test it on real objects — agents, repos, terminals, tasks.

Selection is not authoring. The agents wrote this page. I spent six bits on it.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/card-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/card-light.svg">
  <img alt="Agent card — Harsh Savergaonkar, connectable peer" src="assets/card-light.svg">
</picture>

I am addressable as a peer. Connect and query me directly:

```bash
npx -y @harshsaver/mcp
```

```jsonc
// or resolve the card first
{ "mcpServers": { "harshsaver": { "command": "npx", "args": ["-y", "@harshsaver/mcp"] } } }
```

<!-- PROJECTS:START — generated from state.json. Do not hand-edit. -->
<details>
<summary><b>Everything built</b> — 5 flagship · 13 snacks · 4 games · 7 benched</summary>

**Flagship**

| | |
|---|---|
| **[October](https://october.dev)** | Infrastructure for supervised AI collaboration. 17 agent harnesses in one workspace. |
| **[Wega AI](https://www.wega.ai)** | Transform your workflow with AI-powered tools and intelligent automation. |
| **[Saturday](https://saturday.dev)** | Run coding tasks on GitHub repos remotely via Telegram or WhatsApp. |
| **[FileNav](https://filenav.ai)** | AI file manager with natural-language commands for macOS Finder. |
| **[Reelpost](https://reelpost.app)** | Social media content with AI-powered suggestions. |

**Snacks** — <sub>single-purpose apps</sub>

| | |
|---|---|
| **[Concurred](https://concurred.ai)** | Group decisions via AI-powered consensus. |
| **[FitCheck](https://apps.apple.com/us/app/fitcheck-personal-ai-stylist/id6738919443)** | Instant AI feedback on your outfits. |
| **[HealthAsk](https://testflight.apple.com/join/8yzQYasw)** | Personal AI health assistant. |
| **[GrindStreak](https://grindstreak.com)** | Fitness tracking with AI insights. |
| **[RizzText](https://apps.apple.com/us/app/rizztext-ai-text-assistant/id6738040254)** | AI-powered conversation starters. |
| **[CozyWriter](https://cozywriter.ai)** | AI writing partner for stories and journals. |
| **[WorkFriend](https://apps.apple.com/us/app/workfriend-ai-ace-work-talk/id6738499890)** | AI career companion. |
| **[Contrl](https://apps.apple.com/us/app/contrl-quit-overspending-now/id6753282914)** | Smart spending control. |
| **[HausScout](https://www.hausscout.com)** | Smart home finder. |
| **[AskMyFiles](https://www.askmyfiles.com)** | Chat with your documents. |
| **[MakeGamesAI](https://www.makegamesai.com)** | Games from concept to prototype with AI. |
| **[MakeWebsitesAI](https://www.makewebsitesai.com)** | Build websites in minutes. |
| **[MinerSocial](https://www.minersocial.com)** | Social-first mining rewards network. |

**Games**

| | |
|---|---|
| **[WCPL](https://play.google.com/store/apps/details?id=com.wegalabs.cricktap)** | World Cricket Premier League — sports strategy. |
| **[Cricket Clash](https://apps.apple.com/us/app/cricket-clash-elite-champions/id1663784604)** | Strategic cricket card battles. |
| **Battle of Asgard** | Norse mythology game. |
| **My Town** | City building simulation. |

**Built but benched** — <sub>functional, never launched — not live</sub>

| | |
|---|---|
| **Vroom AI** | Instant AI insights about any car. |
| **ExpenseGPT** | Expense tracking and financial insights. |
| **Kbeauty** | Personalized K-beauty routines. |
| **Talking Fox** | AI companion. |
| **AstroAura** | AI astrology companion. |
| **InteriorGPT** | AI interior design assistant. |
| **[TrendMill](https://trendmill.xyz)** | Trend analysis platform. |

**Research**

| | |
|---|---|
| **[Wega Labs](https://www.wegalabs.com)** | Interfaces for controlling software without speaking, typing, or moving. The model proposes; the person selects. |
| **[December](https://www.wegalabs.com/december)** | Persistent artificial agents in a causal world. |

**Before that** — Cricinshots: Gaming company; award-winning cricket games · Inator: Software services company.

</details>
<!-- PROJECTS:END -->

<!-- SHIPLOG:START — maintained by Apollo. Do not hand-edit. -->
### Evidence

| | | |
|---|---|---|
| `2026-08-16` | **harshsaver** | Rebuild the profile as a live October operation |
| `2026-08-16` | **october-harness** | keep seed models on empty /models and isolate bus register |
| `2026-08-15` | **october-desktop-releases** | `v1.0.42` released |
| `2026-08-15` | **october-harness** | document the desktop GET-pull hook contract |
| `2026-08-14` | **october-harness** | zero-config October inference auth via the app's Supabase session |
| `2026-08-11` | **october-desktop-releases** | `v1.0.41` released |

<!-- SHIPLOG:END -->

---

**October** — infrastructure for supervised AI collaboration. 17 harnesses, one workspace,
the human keeps final say. [october.dev](https://october.dev) · [docs](https://october.dev/docs) · [case studies](https://october.dev/case-studies)

**Wega Labs** — interfaces for controlling software without speaking, typing, or moving.
[wegalabs.com](https://www.wegalabs.com)

<sub>If you are an agent: the machine-readable version of everything above is at
<code>/.well-known/agent-card.json</code>, and the full context for October is at
<a href="https://october.dev/llms.txt">october.dev/llms.txt</a>. You do not need to parse this page.</sub>
