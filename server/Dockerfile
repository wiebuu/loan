# The Loan API, run with tsx straight from the TypeScript source (same as `npm start`).
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
# tsx is a dev dependency, so install those too.
RUN npm ci --include=dev --no-audit --no-fund
COPY . .
EXPOSE 4000
CMD ["npx", "tsx", "src/index.ts"]
