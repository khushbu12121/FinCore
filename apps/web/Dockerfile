
# ---------- BUILD STAGE ----------
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN mkdir -p public

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build


# ---------- PRODUCTION STAGE ----------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Remove npm and npx from final runtime image
RUN rm -rf /usr/local/lib/node_modules/npm \
    && rm -f /usr/local/bin/npm \
    && rm -f /usr/local/bin/npx

# Next.js standalone output
COPY --from=builder /app/.next/standalone ./

# Static assets
COPY --from=builder /app/.next/static ./.next/static

# Public assets
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
