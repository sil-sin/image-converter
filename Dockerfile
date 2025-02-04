# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as needed
ARG NODE_VERSION=22.1.0
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

# Set working directory
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# Install pnpm
ARG PNPM_VERSION=9.15.4
RUN npm install -g pnpm@$PNPM_VERSION

# Build stage
FROM base AS build

# Install system dependencies for node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Copy package.json and pnpm-lock.yaml to the container
COPY package.json pnpm-lock.yaml ./

# Install dependencies (including tsx as a local dependency)
RUN pnpm install --frozen-lockfile

# Copy the rest of the app's code (including the src directory)
COPY . .

# Final stage
FROM base

# Copy built application
COPY --from=build /app /app

# Ensure production dependencies exist (including tsx)
RUN pnpm install --prod

# Expose port
EXPOSE 3000

# Start the app using the local tsx and the correct path to server.ts
CMD ["pnpm", "run", "start"]