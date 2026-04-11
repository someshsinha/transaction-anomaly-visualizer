FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source code
COPY dashboard ./dashboard

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
