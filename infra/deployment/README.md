\# FinCore Secure Deployment (Assessment 14)



\## Architecture



FinCore is deployed using Docker Compose with the following services:



\- \*\*Nginx\*\* – Reverse proxy, HTTPS termination, HTTP-to-HTTPS redirection, rate limiting and security headers.

\- \*\*Web\*\* – Next.js frontend.

\- \*\*API\*\* – Express backend.

\- \*\*Analytics\*\* – FastAPI service.

\- \*\*PostgreSQL\*\* – Primary database.

\- \*\*Redis\*\* – Caching/service support.



\## Network Security



\- PostgreSQL and Redis are not exposed directly to host ports.

\- Backend services communicate through Docker networks.

\- The backend network is configured as internal.

\- Nginx exposes ports 80 and 443.

\- Containers use `no-new-privileges`.

\- Secrets are supplied through environment variables and `.env`.



\## HTTPS



Local deployment uses a self-signed certificate.



HTTP requests redirect to HTTPS.



TLS protocols enabled:

\- TLS 1.2

\- TLS 1.3



Security headers:

\- X-Content-Type-Options

\- X-Frame-Options

\- Referrer-Policy



\## Deployment



From the project root:



```powershell

docker compose --env-file .env -f infra/deployment/docker-compose.secure.yml up -d --build

