# ---- Build stage ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && cp -R node_modules /prod_modules && npm install
COPY . .
RUN npm run build

# ---- Production stage ----
FROM node:22-alpine
WORKDIR /app
COPY --from=builder /prod_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
EXPOSE ${PORT:-3000}
CMD ["node", "dist/main.js"]
