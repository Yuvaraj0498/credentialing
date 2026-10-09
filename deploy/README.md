# Two sites, one codebase

| | desssnext (testing) | credentiallingjs (live) |
|---|---|---|
| Folder | `/var/www/Vhost/desssnext.desss-portfolio.com` | `/var/www/Vhost/credentiallingjs.desss-portfolio.com` |
| Git branch | `main` | `production` |
| Database | `credentialing` | `zmartcredential` |
| API port (`server.port`) | 8085 | 8086 |
| Admin port (`ADMIN_PORT`) | 3008 | 3009 |
| pm2 names | `credential-backend`, `credential-admin` | `zmart-backend`, `zmart-admin` |
| Apache config | `deploy/apache/desssnext.desss-portfolio.com.conf` | `deploy/apache/credentiallingjs.desss-portfolio.com.conf` |

Everything in git is the same for both sites. What differs lives only in git-ignored files, so `git pull` never
touches it:

- `backend/config/application.properties` — port, database, keys, site address, email
- `deploy/site.env` — branch, pm2 names, admin port
- `backend/uploads/` — the site's uploaded documents

## Releasing a change

1. Commit and push to `main` from the local copy.
2. Testing site: `bash deploy/deploy.sh` and check it.
3. When it is good, move live to the same code: `git push origin main:production` (from the local copy),
   then on the live site: `bash deploy/deploy.sh`.

The script stops if a tracked file was edited on the server, so nothing gets mixed into an update.
Database changes are Flyway migrations: each site's backend applies them to its own database when it restarts.
