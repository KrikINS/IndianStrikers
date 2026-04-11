# --- Build Stage for Frontend ---
FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Final Production Stage ---
FROM node:20-slim
WORKDIR /app

# Install production dependencies for the API
COPY api/package*.json ./api/
WORKDIR /app/api
RUN npm install --omit=dev

# Copy API source
COPY api/ ./

# Copy built frontend assets from the builder stage
# We assume the API will be configured to serve these from /app/api/public or similar
COPY --from=frontend-builder /app/dist ./public

# Environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Cloud Run expects the app to listen on the PORT environment variable
EXPOSE 8080

CMD ["node", "index.js"]
