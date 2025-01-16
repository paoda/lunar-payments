# Use official Deno image as base
FROM denoland/deno:latest

# Set working directory
WORKDIR /app

# Copy application files
COPY . .

ARG BASE_URL
ARG NODE_ENV

ENV BASE_URL $BASE_URL
ENV NODE_ENV $NODE_ENV

# Install dependencies
RUN deno install

# Build frontend
RUN deno task build

# Start the server
CMD ["deno", "task", "server:start"]
