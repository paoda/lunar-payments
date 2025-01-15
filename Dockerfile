# Use official Deno image as base
FROM denoland/deno:latest

# Set working directory
WORKDIR /app

# Copy application files
COPY . .

# Set production environment
ENV NODE_ENV=production

# Install dependencies
RUN deno install

# Build frontend
RUN deno task build

# Start the server
CMD ["deno", "task", "server:start"]
