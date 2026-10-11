# Production Launch Checklist

Hosting on AWS? Start with [aws-deployment.md](aws-deployment.md); this checklist is the hosting-neutral
version of the same things.

Work through this top to bottom before the first real customer signs up. Items marked
**(you)** can't be done by the application: they depend on your hosting and accounts.

## 0. Check the configuration automatically

```bash
php artisan deskzeal:preflight --production
```

It exits non-zero and says what is wrong: debug mode, placeholder mail, a synchronous
queue, localhost URLs, missing payment or inbound-email keys, demo accounts, pending
migrations. Run it again after every configuration change; it is also safe to run in CI.
Start from `api/.env.production.example`.

## 1. Secrets

- [ ] **(you)** **Rotate every secret that has ever been in `api/.env`**: the Gmail app
      passwords, `APP_KEY`, database password, Razorpay and Mailgun keys. That file was
      committed to git earlier, so anyone with the repository (or its history) has them.
      It is now untracked, but history still contains it.
- [ ] **(you)** Decide whether to scrub the git history (`git filter-repo`) or just treat
      the old values as burned. Rotating is the part that matters.
- [ ] Generate a **new** `APP_KEY` for production. Changing it later logs everyone out and
      makes stored two-factor secrets unreadable (they are encrypted with it), so keep it
      safe and back it up.
- [ ] Put secrets in your host's secret manager, never in the image or the repository.

## 2. Application settings

- [ ] `APP_ENV=production`, `APP_DEBUG=false`, `LOG_LEVEL=warning`.
- [ ] `APP_URL` and `FRONTEND_URL` are the public `https://` addresses;
      `CORS_ALLOWED_ORIGINS` lists only the real web address.
- [ ] Run the `production` image (docker-compose.prod.yml). It reads its settings when the container
      starts, so after changing a setting just restart the containers.
- [ ] `php artisan migrate --force` on deploy.
- [ ] Do **not** run the demo seeders. Seed only what production needs
      (`RolesAndPermissionsSeeder`, `MembershipPlanSeeder`, `NotificationTemplateSeeder`,
      `SystemSettingSeeder`) and create your platform administrator with
      `php artisan deskzeal:create-platform-admin you@yourcompany.com` (it asks for a strong
      password). `deploy/aws/first-run.sh` does both. The demo accounts (`…@deskzeal.test`, password `password`) must not exist.

## 3. Background work

- [ ] **(you)** A queue worker running continuously (`php artisan queue:work`) under a
      supervisor that restarts it. Without it, `QUEUE_CONNECTION=redis/database` jobs
      (email, webhooks) never run.
- [ ] **(you)** The scheduler: a cron entry running `php artisan schedule:run` every minute
      (SLA breach flagging, renewal invoices, subscription lapses, clean-up).
- [ ] Redis (or another shared store) for cache and sessions if you run more than one server.

## 4. Email

- [ ] **(you)** A transactional provider (Postmark, Mailgun, Amazon SES, Brevo…) with SPF
      and DKIM published for your sending domain. Gmail SMTP is for testing only.
- [ ] `MAIL_FROM_ADDRESS` is on that domain. Send yourself a test of each kind: ticket
      created, agent reply, password reset.
- [ ] Email-to-ticket: follow `docs/email-to-ticket.md` and set `INBOUND_EMAIL_DOMAIN` and
      `MAILGUN_SIGNING_KEY`.

## 5. Payments

- [ ] **(you)** Live Razorpay keys and webhook secret; webhook URL set in the dashboard.
- [ ] **(you)** Test the whole path with a real small payment: subscribe, pay, confirm the
      invoice is marked paid, then a failed payment and a plan change. Test mode proves
      the code; only a live payment proves your account setup.

## 6. Network and hosting

- [ ] **(you)** HTTPS everywhere with a valid certificate; redirect HTTP to HTTPS; send an
      `Strict-Transport-Security` header from your proxy.
- [ ] The API container is not publicly reachable except through the proxy; the database is
      not reachable from the internet.
- [ ] Attachments on durable storage (`FILESYSTEM_DISK=s3`, or a persistent volume).
- [ ] The web app is built with the production API URL (`VITE_API_URL`,
      `VITE_SUPPORT_EMAIL`, `VITE_LEGAL_ENTITY`) and served over HTTPS.

## 7. Data safety

- [ ] **(you)** Automated database backups, with a **restore tested** at least once.
      Backups contain personal data: encrypt them and limit who can read them.
- [ ] Backups of the attachment store.
- [ ] A decision on how long you keep backups, so it matches what the Privacy Policy says
      about deletion.
- [ ] Customer data requests: export and erase are in the customer's page
      (`customers.export` / `customers.erase`, Administrators only). Erasing a customer
      does not remove them from your backups; they age out under your retention rule.

## 8. Monitoring

- [ ] Error tracking keys set and a test error received (see [error-tracking.md](error-tracking.md)); **(you)** an uptime check on the API and the
      web app, and an alert if the queue backs up or the worker stops.
- [ ] Log rotation (`LOG_STACK=daily` keeps 14 days by default).
- [ ] `php artisan queue:failed` reviewed regularly.

## 9. People

- [ ] The legal pages (Terms, Privacy, Cookies) reviewed by a lawyer, with your company
      details, and `VITE_LEGAL_ENTITY` / `VITE_SUPPORT_EMAIL` set.
- [ ] Administrators turn on two-step verification (Account → Security).
- [ ] An answer ready for "who do I contact when something goes wrong?" and a way to
      unlock an account (Users → Unlock) or reset someone's two-step verification.
