# First Release on AWS

What you need, and exactly how to put SupportHub on AWS for the first release.

This is a **single-server** setup: simple enough to run and understand on day one, sturdy
enough for the first customers, with a clear path to grow (see [What this does not give
you](#what-this-does-not-give-you)).

> **Status of the files in this guide.** The container images, the production compose file and
> the scripts were built and exercised on a laptop: the images build, the full stack comes up
> healthy, migrations/queue/scheduler/health check/rate limiting work, and the scripts were run
> against stand-ins for the AWS commands. **They have not been run against a real AWS
> account.** Expect to fix a small thing or two on the first real deploy, and do that deploy
> on a staging copy before the real one.

---

## 1. What the first release needs (the short list)

### Accounts and things only you can provide

| # | You need | Why |
|---|---|---|
| 1 | An **AWS account** with billing set up and MFA on the root user | Everything below |
| 2 | A **domain name you own** (e.g. `example.com`) | Website, tenant workspaces and API addresses |
| 3 | **Amazon SES** access to send email (production access approved) | Ticket, password-reset and verification emails |
| 4 | **Razorpay live account** + keys + webhook secret | Taking payments for paid plans |
| 5 | **Mailgun account** (only if you offer email-to-ticket) | Receiving support email |
| 6 | The **git repository** reachable from the server (GitHub/CodeCommit + a deploy key or token) | The server pulls the code |
| 7 | A **lawyer's review** of the Terms / Privacy / Cookie pages, and your company name/contact email | The pages are templates |

### AWS resources to create

| Resource | First-release size | Purpose |
|---|---|---|
| Route 53 hosted zone | 1 | DNS for the domain |
| ACM certificates | 2 (one in `us-east-1`, one in your region) | HTTPS |
| EC2 instance | Ubuntu 24.04, `t3.medium` (2 vCPU, 4 GB), 30 GB gp3 encrypted | Runs the API, queue worker, scheduler, Redis |
| Application Load Balancer | 1, internet-facing | HTTPS in front of the API |
| RDS for MySQL 8 | `db.t4g.small` or `db.t3.small`, 20+ GB gp3, encrypted, automated backups | The database |
| S3 bucket (attachments) | private, versioned, encrypted | Ticket attachments |
| S3 bucket (website) | private | The web app's files |
| CloudFront distribution | 1 | Serves the web app on the root and every `*.example.com` |
| IAM role for the EC2 instance | 1 | Lets the server read secrets and use the attachments bucket |
| SSM Parameter Store | ~30 parameters | The secrets/settings |
| CloudWatch alarms + SNS topic | a handful | Tells you when something breaks |

### Code and configuration (done in this repository)

- [x] Production images that contain no secrets and read their settings when they start
- [x] `docker-compose.prod.yml` (API, web server, queue worker, scheduler, Redis)
- [x] Reads real visitor IPs behind the load balancer (without this, one visitor's failed
      sign-ins would lock everyone out; it is tested)
- [x] Sign-ins expire (`SANCTUM_TOKEN_EXPIRATION_MINUTES`), account lockout, two-step verification
- [x] `supporthub:preflight --production` checks the configuration, `supporthub:create-platform-admin`
      creates the first admin without the demo accounts
- [x] Deploy, rollback and first-run scripts in `deploy/aws/`

### Before you let the first customer in

- [ ] Every item in [section 12](#12-launch-day-checklist) ticked
- [ ] A **test restore** of an RDS snapshot done once
- [ ] A **real small payment** made and reconciled
- [ ] All secrets that were ever in `api/.env` **rotated** (that file was committed once)

---

## 2. The picture

```
                       Route 53 (DNS for example.com)
        example.com, *.example.com                  api.example.com
                    │                                     │
              ┌─────▼──────┐                       ┌──────▼───────┐
              │ CloudFront │  ACM cert (us-east-1) │     ALB      │  ACM cert (your region)
              └─────┬──────┘                       └──────┬───────┘
                    │ private                             │ :80, only from the ALB
              ┌─────▼──────┐                  ┌───────────▼─────────────── EC2 (Docker) ──────┐
              │ S3: website │                 │ nginx ─▶ app (php-fpm)    queue    scheduler    │
              │ (web app)   │                 │                 │           │         │         │
              └────────────┘                  │                 └───── redis ─────────┘         │
                                              └──────────┬─────────────────┬───────────────────┘
                                                         │ :3306           │ IAM role
                                                 ┌───────▼──────┐   ┌──────▼───────┐
                                                 │ RDS MySQL     │   │ S3: attachments│
                                                 └──────────────┘   └───────────────┘
     Email out: SES (SMTP)      Email in (optional): Mailgun ─▶ https://api.example.com/api/v1/inbound-email/mailgun
     Payments: Razorpay ─▶ https://api.example.com/api/v1/billing/razorpay/webhook
```

Addresses (from [workspace-domains.md](workspace-domains.md)): the website and login at
`https://example.com`, each customer workspace at `https://<workspace>.example.com`, the API
at `https://api.example.com`. One web build serves every workspace.

---

## 3. Decide these first

| Decision | Recommendation |
|---|---|
| Region | One close to your customers; use it for everything except the CloudFront certificate (which must be `us-east-1`) |
| Domain | Put DNS in Route 53 (simplest: certificates validate themselves) |
| Names | `supporthub-prod` prefix for everything; keep a staging copy with `-staging` |
| Where email comes from | `support@example.com` on a domain you verify in SES |
| Environment name in SSM | `/supporthub/prod/` (the scripts use this path) |

Keep a note of: AWS account ID, region, domain, VPC ID, the names you pick.

---

## 4. Build it, in this order

### 4.1 DNS and certificates

1. Route 53 → **Create hosted zone** for `example.com`; point the domain registrar's name servers
   at the four Route 53 ones.
2. **ACM, region `us-east-1`** → request a public certificate for **both** `example.com` and
   `*.example.com` (the wildcard does *not* cover the root, so list both) → *DNS validation* →
   "Create records in Route 53". This one is for CloudFront.
3. **ACM, your own region** → request a certificate for `api.example.com` → same validation.
   This one is for the load balancer.

Wait until both show **Issued**.

### 4.2 Network and security groups

The **default VPC** is fine for the first release. Create three security groups:

| Security group | Inbound rule | Why |
|---|---|---|
| `sg-alb` | 443 and 80 from `0.0.0.0/0` | The public entrance |
| `sg-app` | **80 from `sg-alb` only.** No SSH. | Only the balancer can reach the API |
| `sg-db` | **3306 from `sg-app` only** | Only the app can reach the database |

No port 22: you will use **Session Manager** (no keys, no open port, audit trail).

### 4.3 Database (RDS)

- Engine **MySQL 8.0**, template *Production* (or *Dev/Test* for staging).
- Instance `db.t4g.small` (or `db.t3.small`), storage **gp3 20 GB with autoscaling on**,
  **Encryption on**.
- **Public access: No.** Security group `sg-db`.
- **Automated backups: on, 14 days.** Deletion protection **on**.
- **Multi-AZ**: recommended once you have paying customers (it roughly doubles the DB price and
  removes the database as a single point of failure); optional for launch.
- Master username `admin`, a strong generated password (keep it in your password manager).

Then create the application's own database and user (do **not** run the app as the master
user). From the server once it exists (section 4.7):

```bash
docker run --rm -it mysql:8.0 mysql -h <rds-endpoint> -u admin -p
```
```sql
CREATE DATABASE supporthub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'supporthub'@'%' IDENTIFIED BY '<a long random password>';
GRANT ALL PRIVILEGES ON supporthub.* TO 'supporthub'@'%';
```

### 4.4 S3 buckets

**Attachments** (`supporthub-attachments-prod`): *Block all public access* **on**, *Versioning* **on**,
default encryption (SSE-S3) on. Add a lifecycle rule to delete non-current versions after 30
days. Attachments are served by the API (after a permission check), never directly from S3.

**Website** (`supporthub-web-prod`): *Block all public access* **on**. CloudFront reads it (below).

### 4.5 IAM role for the server

1. IAM → Roles → **Create role** → EC2. Attach the AWS-managed policy
   **`AmazonSSMManagedInstanceCore`** (this is what lets Session Manager work).
2. Add an inline policy from [`deploy/aws/iam-instance-policy.json`](../deploy/aws/iam-instance-policy.json),
   replacing `REGION`, `ACCOUNT_ID` and `ATTACHMENTS_BUCKET`. It allows exactly: read
   `/supporthub/prod/*` parameters, and read/write/delete in the attachments bucket.
3. Name it `supporthub-prod-app`. The instance profile it creates is what you attach in 4.7.

Because the server uses this role, **no AWS access keys** go in any file.

### 4.6 Secrets and settings (SSM Parameter Store)

Create one parameter per line of [`api/.env.production.example`](../api/.env.production.example),
named `/supporthub/prod/<KEY>`, type **SecureString** for anything secret. Generate the values:

```bash
# APP_KEY (run anywhere that has the code, or: docker run --rm supporthub-api:latest php artisan key:generate --show)
php artisan key:generate --show

# DB_PASSWORD, REDIS_PASSWORD, and so on
openssl rand -base64 32 | tr -d '/+=' | cut -c1-32
```

| Parameter | Value |
|---|---|
| `APP_ENV` / `APP_DEBUG` | `production` / `false` |
| `APP_URL` | `https://api.example.com` |
| `FRONTEND_URL` | `https://example.com` |
| `CORS_ALLOWED_ORIGINS` | `https://example.com,https://www.example.com` |
| `WORKSPACE_DOMAIN` / `WORKSPACE_SCHEME` | `example.com` / `https` |
| `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | the RDS endpoint and the user from 4.3 |
| `REDIS_PASSWORD` | a random value (the Redis container is not reachable from outside) |
| `MAIL_*` | SES SMTP settings (4.9) |
| `AWS_DEFAULT_REGION`, `AWS_BUCKET`, `FILESYSTEM_DISK` | your region, the attachments bucket, `s3` |
| `RAZORPAY_*` | live keys + webhook secret (4.11) |
| `SANCTUM_TOKEN_EXPIRATION_MINUTES` | `43200` |
| `LOG_CHANNEL` | `stderr` |

Rules: **no single quote (`'`) inside a value** (the script refuses it); leave `AWS_ACCESS_KEY_ID`
and `AWS_SECRET_ACCESS_KEY` **unset**.

### 4.7 The server (EC2)

Launch an instance:

- AMI **Ubuntu Server 24.04 LTS**, type `t3.medium`, **30 GB gp3**, *encrypted*.
- Security group `sg-app`. **No key pair.** IAM instance profile `supporthub-prod-app`.
- Advanced details → **Metadata version: V2 only** and **Metadata response hop limit: 2**.
  The hop limit matters: without it the containers cannot reach the instance role and every
  attachment upload fails with a credentials error.
- Turn on **termination protection**.

Connect with **Session Manager** (EC2 → Connect → Session Manager), then:

```bash
sudo REPO_URL=<your git url> BRANCH=main bash -c "$(curl -fsSL <raw url of deploy/aws/bootstrap-ec2.sh>)"
# or: clone the repo yourself to /opt/supporthub/app and run deploy/aws/bootstrap-ec2.sh
```

This installs Docker, the AWS CLI and git, and puts the code in `/opt/supporthub/app`.

### 4.8 Load balancer

1. EC2 → **Target groups** → create: type *Instances*, protocol HTTP, port **80**, health check
   path **`/up`** (success code `200`). Register the instance.
2. EC2 → **Load balancers** → create an **Application Load Balancer**, internet-facing, at least
   two subnets, security group `sg-alb`.
3. Listener **443 (HTTPS)** → forward to the target group, certificate = the `api.example.com`
   one from 4.1. Listener **80 (HTTP)** → *redirect to HTTPS (301)*.
4. Route 53 → record `api.example.com` → **A (alias)** → the load balancer.

### 4.9 Email: Amazon SES

1. SES → **Identities** → *Create identity* → **Domain** `example.com` with *Easy DKIM*. Publish
   the three CNAMEs it shows (one click if the zone is in Route 53).
2. Add an **SPF** TXT record `v=spf1 include:amazonses.com ~all` and a **DMARC** TXT record at
   `_dmarc.example.com`, e.g. `v=DMARC1; p=none; rua=mailto:dmarc@example.com` (move to
   `p=quarantine` once you are sure mail flows).
3. A new SES account is in the **sandbox** (it can only email addresses you have verified).
   **Request production access** (Account dashboard) and explain the use: transactional
   help-desk email. This can take a day, so do it early.
4. SES → **SMTP settings** → *Create SMTP credentials*. Use them as `MAIL_USERNAME` /
   `MAIL_PASSWORD`; `MAIL_HOST=email-smtp.<region>.amazonaws.com`, `MAIL_PORT=587`.
5. `MAIL_FROM_ADDRESS=support@example.com`.
6. Set up **bounce and complaint handling** (SES → configuration set → SNS topic → your email) so
   you hear about them. High bounce/complaint rates get a sending account suspended.

### 4.10 The website (S3 + CloudFront)

1. CloudFront → **Create distribution**. Origin: the website bucket using **Origin Access Control**
   (let CloudFront update the bucket policy). Default root object: `index.html`.
2. **Alternate domain names (CNAMEs):** `example.com` **and** `*.example.com`. Custom SSL certificate:
   the `us-east-1` one. Redirect HTTP to HTTPS. Compress objects on.
3. **Error pages** (this is what makes `/login`, `/dashboard`, `/tickets/123` work on refresh):
   for HTTP **403** and **404**, respond with `/index.html`, HTTP response code **200**, TTL 0.
4. Response headers policy: *SecurityHeadersPolicy* (adds HSTS and friends).
5. Route 53: records `example.com` and `*.example.com` → **A (alias)** (and AAAA) → the distribution.

### 4.11 Payments, and email-to-ticket

- **Razorpay:** switch the dashboard to *Live*, copy the key id/secret, create a webhook to
  `https://api.example.com/api/v1/billing/razorpay/webhook` for payment events and copy its secret.
- **Email-to-ticket (optional):** follow [email-to-ticket.md](email-to-ticket.md). The inbound subdomain's
  MX records point at Mailgun; set `INBOUND_EMAIL_DOMAIN` and `MAILGUN_SIGNING_KEY`. It does not
  interfere with SES.

---

## 5. First deploy

On the server (Session Manager):

```bash
# 1. Pull the settings from Parameter Store and deploy
sudo /opt/supporthub/app/deploy/aws/deploy-api.sh

# 2. Load the reference data and create the first platform administrator (once)
sudo /opt/supporthub/app/deploy/aws/first-run.sh
```

`deploy-api.sh` builds the images, runs the migrations, starts everything, waits for the health
check and runs the configuration check. Nothing demo-related is loaded.

From your laptop (or CI), publish the website:

```bash
WEB_BUCKET=supporthub-web-prod \
CLOUDFRONT_DISTRIBUTION_ID=E123ABC456 \
VITE_API_URL=https://api.example.com/api/v1 \
VITE_WORKSPACE_DOMAIN=example.com \
VITE_SUPPORT_EMAIL=support@example.com \
VITE_LEGAL_ENTITY="Example Ltd." \
deploy/aws/deploy-web.sh
```

---

## 6. Check that it works

On the server:

```bash
curl -s localhost/up                                    # 200
sudo docker compose --env-file /opt/supporthub/.env.production -f /opt/supporthub/app/docker-compose.prod.yml ps
sudo docker compose --env-file /opt/supporthub/.env.production -f /opt/supporthub/app/docker-compose.prod.yml \
     exec -T app php artisan supporthub:preflight --production      # everything PASS
```

From a browser and your phone:

1. `https://example.com` shows the home page; `https://example.com/pricing` shows plans (so the API is reachable and CORS is right).
2. **Create a test workspace** from the sign-up page. You get the verification email (so SES works), you can sign in, and `https://<your-workspace>.example.com` loads.
3. Create a ticket, reply, attach a PDF (so S3 and the IAM role work), download it again.
4. Create a customer through the integration API with an API key ([integration-guide.md](integration-guide.md)).
5. Turn on two-step verification for your platform administrator account.
6. Make one real **paid** subscription with a small amount and confirm the invoice turns *paid*. Then refund it.
7. Send an email to a workspace's inbound address (if you use that feature) and see the ticket appear.
8. Kill the queue worker container and watch it come back: `sudo docker kill supporthub-queue-1`.

---

## 7. Everyday operations

| Task | How |
|---|---|
| Deploy new code | `sudo /opt/supporthub/app/deploy/aws/deploy-api.sh` (API) and `deploy-web.sh` (website) |
| Deploy a specific version | `deploy-api.sh v1.0.3` |
| Roll back | `sudo deploy/aws/rollback.sh <tag>` (tags in `/opt/supporthub/deploys.log`). It does **not** undo migrations, so keep migrations backward compatible |
| Change a setting | Edit the SSM parameter, then `deploy-api.sh` (it re-reads them and restarts) |
| Read logs | `sudo docker compose … logs -f app queue` (`--tail 200`) |
| Run a command | `sudo docker compose … exec app php artisan <command>` |
| Unlock a user / reset their 2FA | The Users page in the product |
| Look at failed background jobs | `exec app php artisan queue:failed` |
| Patch the server | `sudo apt-get update && sudo apt-get -y upgrade`, reboot in a quiet hour (containers restart themselves) |

### Backups (do not skip)

- **RDS automated backups** (14 days, point-in-time restore) are on from 4.3. **Take a manual
  snapshot before every release that has a migration.**
- **Test a restore** once: restore a snapshot to a new instance, point a staging copy at it, and sign in.
  A backup you have never restored is a hope, not a backup.
- **Attachments:** S3 versioning protects against accidental deletes/overwrites.
- Note: erasing a customer in the product does not remove them from backups. They age out under your
  retention period, which should match what the Privacy Policy says.

### Alarms (CloudWatch → SNS email/SMS to you)

At minimum: ALB **UnHealthyHostCount > 0**, ALB **HTTPCode_Target_5XX_Count** high, ALB
**TargetResponseTime** high, EC2 **StatusCheckFailed**, EC2 **CPUUtilization > 80%** for 15 min,
RDS **CPUUtilization**, **FreeStorageSpace** low, **FreeableMemory** low, **DatabaseConnections** high.
Add an external uptime check on `https://api.example.com/up` and `https://example.com`.

**Not included:** application error tracking (Sentry/Bugsnag/Flare). Errors go to the container log
only. Add one before you have many customers; it is the difference between hearing about a bug from your
logs and hearing about it from a customer.

---

## 8. Settings that matter, and what breaks without them

| Missing or wrong | What you see |
|---|---|
| `TRUSTED_PROXIES` wrong | Everyone shares one IP: the sign-in rate limit (10/min) locks all users out together |
| Instance **hop limit 1** | Attachment uploads fail with an AWS credentials error |
| CloudFront **403/404 → index.html** missing | Refreshing `/login` or any page shows an XML error |
| `*.example.com` missing on CloudFront or the certificate | Workspace subdomains show a certificate error |
| `CORS_ALLOWED_ORIGINS` / `WORKSPACE_DOMAIN` differ between API and web build | Pages load but every API call fails |
| Web built with the wrong `VITE_API_URL` | Same; rebuild with `deploy-web.sh` |
| Queue worker not running | No emails, no webhooks, nothing after "queued" |
| Scheduler not running | No SLA breach flags, no renewal invoices, subscriptions never lapse |
| SES still in sandbox | Only verified addresses get email |
| `APP_KEY` changed | Everyone signed out; two-step verification secrets unreadable |
| Razorpay webhook secret wrong | Payments succeed at Razorpay but invoices never turn *paid* |

---

## 9. Troubleshooting

| Symptom | Look at |
|---|---|
| Target group says *unhealthy* | `curl localhost/up` on the server; `docker compose … ps`; `logs nginx app`; is `sg-app` open on 80 from `sg-alb`? |
| `502` from the load balancer | The app container is down or restarting: `logs app` |
| `500` on everything | `logs app`. A missing setting is the usual cause; run the preflight command |
| `deploy-api.sh` fails at migrate | Read the error; fix; run again. The old version keeps serving until the new one starts |
| Emails not arriving | `logs queue`; SES sandbox? Bounce/suppression list? SPF/DKIM published? |
| Preflight says `Visitor IPs…` FAIL | `TRUSTED_PROXIES` is empty |
| Cannot create the first admin | Did `first-run.sh` finish the seeders? The role table must exist |
| Out of disk | `docker system df`; `docker image prune -a` for old images |

---

## 10. What this does not give you

Be clear-eyed about these before you promise anyone an uptime figure.

- **One server.** If the instance dies or is being replaced, the API is down until it is back
  (minutes). A deploy restarts containers: expect a few seconds of errors per release.
- **Redis is on that server.** If the server is lost, queued jobs and cache go with it. Sessions are
  token-based, so people just sign in again; billing and ticket data are in RDS and are safe.
- **No autoscaling.** A `t3.medium` handles a small customer base comfortably; watch CPU and RDS
  connections as you grow.
- **Images are built on the server** (slower and uses its CPU). Pushing images from CI to ECR is the next improvement.
- **No error tracking, no centralized log search** (see section 7).
- **The scripts have not been run on real AWS yet** (note at the top).

When you outgrow it, the sensible next steps are: Multi-AZ RDS, ElastiCache for Redis, an Auto Scaling
group of two or more API servers behind the same load balancer, and ECS Fargate or EKS instead of one VM.
The application is already built for that: it keeps no state on the server (sessions are tokens, attachments
are in S3, cache and queue are in Redis), and the images contain no environment-specific settings.

---

## 11. Rough cost, and what drives it

Prices change and depend on region, so use the [AWS Pricing Calculator](https://calculator.aws/) with the
sizes in section 1. The main monthly items, largest first: the **RDS instance**, the **EC2 instance**, the
**load balancer** (an hourly charge plus traffic), then small ones (S3, CloudFront, Route 53, SES, CloudWatch,
data transfer). Multi-AZ RDS about doubles the database line. Reserved capacity or Savings Plans lower the
EC2/RDS lines once you are sure of the sizes.

---

## 12. Launch day checklist

**Before**
- [ ] Domain's name servers point at Route 53; both certificates *Issued*
- [ ] SES domain verified, DKIM *Successful*, **production access granted**
- [ ] Razorpay live keys + webhook created
- [ ] All secrets in SSM; **old `api/.env` secrets rotated**
- [ ] Staging copy deployed and walked through section 6
- [ ] Terms/Privacy/Cookie pages reviewed; `VITE_LEGAL_ENTITY` and `VITE_SUPPORT_EMAIL` set
- [ ] CloudWatch alarms created and tested (a test email arrives)
- [ ] RDS automated backups on; **a restore tested**

**Launch**
- [ ] Manual RDS snapshot
- [ ] `deploy-api.sh`, `first-run.sh`, `deploy-web.sh`
- [ ] `supporthub:preflight --production` all PASS
- [ ] Section 6 walked through on the live addresses (including a real paid subscription)
- [ ] Platform administrator has two-step verification on; recovery codes stored in a password manager
- [ ] Demo accounts do not exist: `exec app php artisan tinker --execute='echo App\Models\User::withoutGlobalScopes()->where("email","like","%@supporthub.test")->count();'` prints `0`

**After**
- [ ] Watch the logs and alarms closely for the first days
- [ ] Put the weekly chores in a calendar: review `queue:failed`, apply OS updates, check backups ran
- [ ] Decide when you will add error tracking and Multi-AZ
