# Dockerfile for Railway deployment
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (no cache mount)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 8080

# Start the server
CMD ["npm", "start"]
