FROM node:20-alpine

# Install git, docker CLI, openssh-client, curl, jq
RUN apk add --no-cache git docker-cli openssh-client curl jq bash

WORKDIR /app

# Generate SSH key for Git
RUN mkdir -p /root/.ssh && \
    ssh-keygen -t ed25519 -f /root/.ssh/id_ed25519 -N '' -C 'deployer@homelab' && \
    echo "Host github.com\n  StrictHostKeyChecking no\n  UserKnownHostsFile=/dev/null" > /root/.ssh/config && \
    echo "Host gitlab.com\n  StrictHostKeyChecking no\n  UserKnownHostsFile=/dev/null" >> /root/.ssh/config && \
    chmod 600 /root/.ssh/config

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy app
COPY . .

# Build TypeScript API + React frontend
RUN npm run build

# Verify build output
RUN ls -la dist-api/ && ls -la dist/

# Create data directory
RUN mkdir -p /app/data

EXPOSE 3000

# Run compiled TypeScript (dist-api/server.js)
CMD ["node", "dist-api/server.js"]
