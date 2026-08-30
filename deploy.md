# Deploying ACLIC to a self-hosted VPS

Target: a small Linux VPS (2GB RAM is enough), Node 20 LTS, nginx in front, TLS via
certbot. No Vercel services are used anywhere in this stack.

## 1. Buy and point the domain

1. Buy the domain from any registrar.
2. In the registrar's DNS panel, create an **A record** (and an **AAAA record** if the VPS
   has IPv6) pointing the root domain and `www` at the VPS's IP address:

   ```
   A     @      <VPS_IPV4>
   A     www    <VPS_IPV4>
   ```
3. DNS propagation can take a few minutes to a few hours. Check with `dig aclic.org +short`
   before moving on to TLS.

## 2. Provision the server

```bash
# As root or via sudo on a fresh Ubuntu 22.04/24.04 VPS:
apt update && apt upgrade -y
apt install -y nginx certbot python3-certbot-nginx git

# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

npm install -g pm2   # or skip this and use the systemd unit in deploy/aclic.service instead

useradd --system --create-home --shell /bin/bash aclic
mkdir -p /opt/aclic
chown aclic:aclic /opt/aclic
```

## 3. First deploy

```bash
su - aclic
cd /opt/aclic
git clone <this-repo-url> src
cd src
cp .env.example .env.production
# Edit .env.production: DATABASE_URL, AUTH_SECRET, NEXT_PUBLIC_SITE_URL,
# ADMIN_EMAIL/ADMIN_PASSWORD (first run only), SUPABASE_*, SMTP_*.

npm ci
npm run db:migrate
npm run db:seed        # creates the first superuser and empty content rows — safe to re-run
npm run build

# Copy the standalone output into the layout nginx.conf expects (/opt/aclic/app):
mkdir -p /opt/aclic/app
cp -r .next/standalone/. /opt/aclic/app/
cp -r .next/static /opt/aclic/app/.next/static
cp -r public /opt/aclic/app/public
cp .env.production /opt/aclic/app/.env.production
```

Start it (pick one):

```bash
# PM2:
pm2 start /opt/aclic/src/deploy/ecosystem.config.js
pm2 save
pm2 startup   # follow the printed instructions to enable on boot

# — or — systemd:
sudo cp /opt/aclic/src/deploy/aclic.service /etc/systemd/system/aclic.service
sudo systemctl daemon-reload
sudo systemctl enable --now aclic
```

Confirm it's up locally before wiring nginx: `curl -I http://127.0.0.1:3000/en`.

## 4. nginx + TLS

```bash
cp /opt/aclic/src/deploy/nginx.conf /etc/nginx/sites-available/aclic.org
# Edit the file: replace aclic.org with the real domain, and fix the
# /opt/aclic/app paths if you deployed somewhere else.
ln -s /etc/nginx/sites-available/aclic.org /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

certbot --nginx -d aclic.org -d www.aclic.org
# certbot rewrites the server block to add the ssl_certificate lines and sets
# up automatic renewal via a systemd timer (certbot.timer) — no cron needed.
```

Visit `https://aclic.org` and confirm the site loads over HTTPS with a valid certificate.

## 5. Nightly backups

```bash
crontab -u aclic -e
# Add:
0 2 * * * . /opt/aclic/app/.env.production && /opt/aclic/src/deploy/backup.sh >> /var/log/aclic-backup.log 2>&1
```

See `deploy/restore.md` for the tested restore procedure.

## 6. Redeploying after changes

```bash
su - aclic
cd /opt/aclic/src
git pull
npm ci
npm run db:migrate   # no-op if there's nothing new to apply
npm run build
rm -rf /opt/aclic/app/.next /opt/aclic/app/*.js /opt/aclic/app/node_modules
cp -r .next/standalone/. /opt/aclic/app/
cp -r .next/static /opt/aclic/app/.next/static
cp -r public /opt/aclic/app/public
pm2 restart aclic   # or: sudo systemctl restart aclic
```

## Alternative: Docker

If you'd rather not manage Node/PM2/nginx directly on the host, `Dockerfile` and
`docker-compose.yml` at the repo root are a drop-in alternative — `docker compose up -d
--build` builds the standalone image and (optionally) a local Postgres container. Put nginx
and certbot in front of the container the same way, proxying to the port it publishes.
