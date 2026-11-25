
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

RUN npm prune --omit=dev


# Production stage
FROM node:24-alpine AS production

WORKDIR /app

# Update npm to reduce vulnerabilities in bundled npm dependencies
RUN npm install -g npm@latest && npm cache clean --force

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 5001

CMD ["npm", "start"]
