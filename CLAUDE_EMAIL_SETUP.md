# Forward-to-Claude Email Setup

Forward any email to your Claude address with a command written at the top, and Claude replies autonomously.

## How it works

1. You forward an email to `claude@vaulto.ai` (or any address on the receiving domain) and write a command above the forwarded content, e.g. "Summarize this and draft a polite decline."
2. Resend receives the email (via an MX record) and POSTs an `email.received` webhook to `/api/email/inbound`.
3. The endpoint verifies the webhook signature, checks the sender is on the allowlist, and ACKs immediately.
4. In the background it fetches the full email body, sends it to Claude (`claude-opus-4-8`, with web search enabled), and emails Claude's answer back to you as a threaded reply.

If you write no command, Claude summarizes the forwarded email and suggests next steps.

## Environment variables

Add these in Vercel (Project → Settings → Environment Variables):

```bash
# Existing
RESEND_API_KEY=re_...              # already set for outbound email
PERPLEXITY_API_KEY=pplx-...        # daily market email

# New — required
ANTHROPIC_API_KEY=sk-ant-...       # console.anthropic.com → API keys
RESEND_WEBHOOK_SECRET=whsec_...    # from the webhook's page in the Resend dashboard (created in step 2 below)

# New — optional
CLAUDE_EMAIL_FROM=claude@vaulto.ai       # reply sender (default shown)
CLAUDE_EMAIL_FROM_NAME=Claude            # reply sender name (default shown)
ALLOWED_EMAIL_SENDERS=charliebc@vaulto.ai,charliebc123@gmail.com  # comma-separated; defaults to these two
CLAUDE_INBOUND_ADDRESS=claude@vaulto.ai  # if set, only mail addressed to this triggers Claude (recommended on a catch-all domain)
CRON_SECRET=...                          # also gates /api/email/send against open-relay abuse
```

## Resend setup (one-time)

### 1. Enable receiving on a domain

**Recommended: use a subdomain** so normal vaulto.ai mail is unaffected.

1. Resend dashboard → Domains → add (or open) the domain you want to receive on, e.g. `mail.vaulto.ai`.
2. Enable receiving and copy the **MX record** Resend shows you.
3. Add that MX record at your DNS provider. It must have the lowest priority value on that name.

Receiving is catch-all: once the MX record is live, *any* address at that domain reaches the webhook (e.g. `claude@mail.vaulto.ai`). The sender allowlist is what gates access.

> ⚠️ If you put the MX record on the root `vaulto.ai` and you already receive mail there (Google Workspace etc.), you will break your normal inbox. Use a subdomain unless vaulto.ai has no existing mailbox.

Zero-DNS alternative for testing: Emails page → Receiving tab → "Receiving address" gives you a `<alias>@<id>.resend.app` address that works immediately.

### 2. Add the webhook

1. Resend dashboard → Webhooks → Add Webhook.
2. URL: `https://<your-vercel-domain>/api/email/inbound`
3. Event: `email.received` only.
4. Copy the signing secret (`whsec_...`) from the webhook's details page → set as `RESEND_WEBHOOK_SECRET` in Vercel → redeploy.

## Usage

Forward an email to your Claude address and type a command at the top:

```
Research this company and tell me if the valuation in this email is reasonable.

---------- Forwarded message ----------
From: ...
```

Example commands:
- "Summarize this thread in 5 bullets."
- "Draft a reply declining politely but keeping the door open."
- "Fact-check the claims in this newsletter." (Claude will use web search)
- "Translate this to English."

The reply arrives in the same thread, from `claude@vaulto.ai`.

### Sending the reply to a different address

By default the reply goes back to whoever forwarded the email. To send it elsewhere, say so **in your command** (the text above the forward), e.g. "Summarize this and send the response to charliebc@ucla.edu".

The redirect only works when:
- the instruction is in **your command**, not inside the forwarded content (an instruction buried in a forwarded email is treated as untrusted and ignored — this is the anti-injection guard), **and**
- the target address is on the sender allowlist (`ALLOWED_EMAIL_SENDERS`).

If the target isn't allowlisted, the redirect is ignored and the reply goes back to you (ask Claude to draft the message and forward it yourself, or add the address to the allowlist first).

## Security model

- **Signature verification**: every webhook is verified against `RESEND_WEBHOOK_SECRET` (svix); forged requests get 401.
- **Sender allowlist**: only `ALLOWED_EMAIL_SENDERS` can trigger Claude. Everything else is ACKed and dropped. The From address is parsed anchored to the last angle-bracket pair, so a quoted-display-name trick like `"x <you@allowed>" <attacker@evil>` resolves to the real sender (`attacker@evil`) and is rejected.
- **Prompt-injection defense**: the forwarded email is fenced as untrusted data, and Claude is instructed never to act on instructions inside it. `web_fetch` is disabled (only `web_search` is on) so injected content can't drive arbitrary outbound requests to exfiltrate the thread.
- **Loop guards**: mail from the Claude sending address is ignored, and auto-responders / list mail (Auto-Submitted, Precedence, List-Id, X-Autoreply headers) are skipped. Replies carry `Auto-Submitted: auto-replied`.
- **Open-relay guard**: `/api/email/send` requires `Authorization: Bearer $CRON_SECRET` when `CRON_SECRET` is set, and validates recipient addresses.
- **Dedupe**: duplicate `email_id`s are dropped (best-effort, in-memory).

## Residual risks (not yet mitigated)

These need infrastructure or config decisions — call them out before relying on this in a hostile setting:

- **From is unauthenticated at the app layer.** The allowlist trusts the From address. A spoofer who can send DMARC-passing mail as an allowlisted domain, or exploits weak inbound DMARC enforcement, could trigger Claude. Mitigation: enforce strict DMARC on the receiving domain, and/or check `Authentication-Results` headers. The worst case is bounded — replies only go back to the allowlisted address (i.e. to you) and cost some tokens.
- **Dedupe and rate-limiting are per-instance and in-memory.** Across cold/concurrent Vercel instances a duplicate delivery can run twice, and there is no per-sender quota. For hard cost control, move dedupe + rate limiting to a shared store (Upstash Redis / Vercel KV, `SET email_id NX EX`).
- **Background processing is bounded by `maxDuration` (300s).** Work aborts at 240s and sends a "cut short" reply; a hard platform kill beyond that drops the email with no retry (Resend already got its 200). Long web-search chains are the main risk.
- **Vercel-only.** Background processing uses `waitUntil`; off-Vercel the handler falls back to awaiting inline (slower ACK).

## Testing

```bash
# Endpoint rejects unsigned requests (expect 400/401)
curl -X POST https://<your-domain>/api/email/inbound -d '{}'
```

Then send a real test: from an allowlisted address, forward any email to the receiving address with "Reply with the word PONG." at the top. Expect a threaded reply within ~1–3 minutes (web-search commands take longer). Check Vercel function logs for `/api/email/inbound` and the Resend dashboard (Emails → Receiving, and Webhooks → delivery attempts) when debugging.

## Limits and caveats

- Attachments are ignored (only the email text is sent to Claude).
- Processing runs in the background after the webhook ACK; hard cap is the function's `maxDuration` (300s).
- Claude cannot send email to third parties — it only replies to you. Ask it to *draft* messages instead.
- Each forward costs Anthropic API tokens (opus-tier, plus web search when used).
