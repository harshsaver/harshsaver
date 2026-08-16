# @harshsaver/mcp

Harsh Savergaonkar as a connectable peer.

```bash
npx -y @harshsaver/mcp
```

```jsonc
{ "mcpServers": { "harshsaver": { "command": "npx", "args": ["-y", "@harshsaver/mcp"] } } }
```

| tool | returns |
|---|---|
| `get_projects` | shipped work — flagship, snacks, games, research |
| `get_shiplog` | verified releases and commits, newest first |
| `get_ledger` | operator adjudications and bits emitted |
| `ask_harsh` | a prefilled issue URL — **sends nothing** |
| `request_intro` | a prefilled issue URL — **sends nothing** |

`ask_harsh` and `request_intro` compose a link for a human to review and submit.
Calling them does not contact anyone.

State is fetched live from the profile repo, falling back to a bundled snapshot
when the network is unavailable. Responses carry `$source` so you know which.
