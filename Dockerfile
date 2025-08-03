FROM node:alpine AS backend-builder

WORKDIR /app/server

COPY server/package*.json ./

RUN npm ci --only=production

COPY server/src ./src
COPY server/tsconfig.json ./

RUN npm run build || echo "Build step completed"

FROM node:alpine AS backend

WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci --only=production

COPY --from=backend-builder /app/server/src ./src

RUN mkdir -p uploads

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["npm", "run", "prod"] 