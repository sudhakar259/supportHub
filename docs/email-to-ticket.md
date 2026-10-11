# Email to Ticket

A workspace can turn emails sent to its support address into tickets. A customer
who writes to `support@acme.com` gets a ticket without using any form, and when
they answer an email from SupportHub their reply lands back in the same ticket.

It uses **Mailgun inbound routing**. Mailgun receives the mail and posts it to
SupportHub, which creates or updates the ticket.

```
customer → support@acme.com ──(forward)──▶ acme@inbound.example.com ──▶ Mailgun
                                                                          │ POST (signed)
                                                                          ▼
                                    SupportHub  /api/v1/inbound-email/mailgun  → ticket
```

## 1. Platform setup (once, by whoever runs SupportHub)

1. **Pick an inbound domain**, for example `inbound.example.com`. Use a
   subdomain you don't use for normal mail.
2. **Add it in Mailgun** (Sending → Domains → Add domain) and publish the DNS
   records Mailgun shows, especially the two **MX records**
   (`mxa.mailgun.org` and `mxb.mailgun.org`, priority 10). Wait until Mailgun
   shows the domain as verified.
3. **Create a Route** (Receiving → Routes → Create route):
   - Expression type: *Match Recipient*, expression `.*@inbound.example.com`
   - Actions: *Forward* to `https://YOUR-API-HOST/api/v1/inbound-email/mailgun`
     and also tick *Stop*.
4. **Copy the signing key** (Sending → Webhooks → *HTTP webhook signing key*).
5. **Set two environment variables** on the API and restart it:

   ```
   INBOUND_EMAIL_DOMAIN=inbound.example.com
   MAILGUN_SIGNING_KEY=your-signing-key
   ```

   Without `MAILGUN_SIGNING_KEY` every request is refused. Without
   `INBOUND_EMAIL_DOMAIN` the feature is unavailable and tenants cannot turn it on.

The webhook URL must be reachable from the internet over HTTPS. For local testing
use a tunnel (for example ngrok) and point the Route at it.

## 2. Workspace setup (each organization)

1. In SupportHub open **Settings → Email to ticket**. It shows the workspace's
   address, which is the workspace slug at your inbound domain, for example
   `acme@inbound.example.com`.
2. **Turn it on.** Choose whether an email from an *unknown* address may create a
   new customer (the default) or must be rejected.
3. **Forward the support mailbox** to that address. In Gmail / Google Workspace:
   Settings → Forwarding and POP/IMAP → *Add a forwarding address*. In Microsoft
   365: a mailbox forwarding rule or a shared-mailbox rule. At the host or DNS
   provider: a forwarder for `support@acme.com`.

   Google and Microsoft send a **confirmation email** to the new forwarding
   address. That email arrives in SupportHub as a ticket, so open it there to read
   the confirmation code or link. (Turn the feature on first, otherwise the
   message is recorded but ignored.)
4. Send a test email to the support address and check **Recent emails** on the
   same settings page.

## What happens to each email

| Situation | Result |
|---|---|
| New email from a known customer | New ticket for that customer. |
| New email from an unknown sender | New customer + new ticket (or rejected, if the workspace turned that off). |
| Reply to an earlier email (matched by the `In-Reply-To` / `References` headers, or a ticket number like `TKT-2026-000012` in the subject) from **that ticket's own customer** | Added as a reply on that ticket, without the quoted history. A *resolved* ticket is reopened. |
| Reply to a **closed** ticket | A new ticket that says "Follow-up to closed ticket …". |
| Someone other than the ticket's customer mentions its number | A new ticket; they cannot write into someone else's conversation. |
| Email from a team member | Ignored (recorded as `ignored_staff_sender`). |
| Auto-replies, out-of-office, bounces, mailing lists, `no-reply` senders, our own inbound address | Ignored (`ignored_auto_generated`), which also prevents mail loops. |
| Workspace reached its plan's tickets-per-month or customers limit | Rejected (`rejected_plan_limit`). |
| The same email delivered twice | Handled once. |

Attachments follow the usual limits: JPG, PNG, WebP, TXT, PDF, DOCX, PPT, PPTX,
2 MB each, 5 per email. Others are skipped and counted in the log.

## Replies going the other way

- Email from SupportHub to a **customer** sets *Reply-To* to the workspace's inbound
  address (when the feature is on), so pressing Reply sends the answer straight
  into the ticket.
- The "agent replied" email now includes the agent's message text, so the customer
  can read it without signing in.
- The subject of ticket emails contains the ticket number, which is what keeps
  replies threaded when the headers are lost.

## Troubleshooting

- **Nothing arrives.** In Mailgun's *Logs*, check the message was received and the
  Route forwarded it. In SupportHub check **Recent emails**; if the message isn't
  there, the Route or the webhook URL is wrong.
- **Mailgun shows the forward failed with 401.** `MAILGUN_SIGNING_KEY` is missing or
  differs from the key in Mailgun. Also check the server clock: requests more than 5
  minutes old are refused.
- **Mailgun shows 406.** The recipient isn't a workspace address (wrong slug or domain).
- **A message shows `rejected_disabled`.** The workspace has the feature turned off.
- **Mail from one customer keeps becoming new tickets.** The reply lost its thread:
  ask them to reply to the SupportHub email, or keep the ticket number in the subject.

## API

| Method & path | Needs | Purpose |
|---|---|---|
| `POST /api/v1/inbound-email/mailgun` | Mailgun signature | Receives the forwarded email. Not for people to call. |
| `GET /api/v1/inbound-email` | `settings.view` | Address, on/off, recent emails. |
| `PUT /api/v1/inbound-email` | `settings.manage` | `{"enabled": true, "create_customers": true}` |
| `GET /api/v1/inbound-email/log` | `settings.view` | Every email received and what became of it. |

Status values in the log: `ticket_created`, `reply_added`, `ignored_auto_generated`,
`ignored_staff_sender`, `rejected_disabled`, `rejected_unknown_sender`,
`rejected_bad_sender`, `rejected_plan_limit`, `failed`.
