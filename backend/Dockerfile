# Use an official Node.js runtime as the base image
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /app

# Copy the root package files for workspace resolution
COPY package.json package-lock.json ./

# Copy the package.json files for the backend and the local detection engine
COPY backend/package.json ./backend/
COPY packages/tav-detection-engine/package.json ./packages/tav-detection-engine/

# Copy the source code of the local detection engine
COPY packages/tav-detection-engine/src ./packages/tav-detection-engine/src

# Install only the production dependencies for the backend workspace
# Note: Using --workspace=tav-backend ensures npm finds the local engine
RUN npm ci --workspace=tav-backend --include-workspace-root --omit=dev

# Copy the backend source code
COPY backend/src ./backend/src

# Expose the port the app runs on
EXPOSE 3000

# Set the working directory to the backend folder
WORKDIR /app/backend

# Default command
CMD ["node", "src/server.js"]
