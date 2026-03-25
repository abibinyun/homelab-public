import fs from 'fs/promises';
import path from 'path';

interface DockerfileResult {
  dockerfile: string;
  port: number;
}

export async function generateDockerfile(repoPath: string, port?: number): Promise<DockerfileResult> {
  const packageJsonPath = path.join(repoPath, 'package.json');
  
  // Check if Node.js project
  if (await fs.access(packageJsonPath).then(() => true).catch(() => false)) {
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Auto-detect port from package.json scripts or use default
    let detectedPort = port || 3000;
    const scripts = packageJson.scripts || {};
    const scriptStr = JSON.stringify(scripts);
    
    // Try to find port in scripts (e.g., "vite preview --port 5173")
    const portMatch = scriptStr.match(/--port[=\s]+(\d+)/);
    if (portMatch) {
      detectedPort = parseInt(portMatch[1]);
    }
    
    // Vite project
    if (deps.vite) {
      return {
        dockerfile: `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm install -g serve
EXPOSE ${detectedPort}
CMD ["serve", "dist", "-l", "${detectedPort}"]`,
        port: detectedPort
      };
    }
    
    // Next.js project
    if (deps.next) {
      detectedPort = 3000; // Next.js default
      return {
        dockerfile: `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE ${detectedPort}
CMD ["npm", "start"]`,
        port: detectedPort
      };
    }
    
    // React (CRA) project
    if (deps['react-scripts']) {
      detectedPort = 3000; // CRA default
      return {
        dockerfile: `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm install -g serve
EXPOSE ${detectedPort}
CMD ["serve", "-s", "build", "-l", "${detectedPort}"]`,
        port: detectedPort
      };
    }
    
    // Generic Node.js
    return {
      dockerfile: `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE ${detectedPort}
CMD ["npm", "start"]`,
      port: detectedPort
    };
  }
  
  // PHP project
  if (await fs.access(path.join(repoPath, 'composer.json')).then(() => true).catch(() => false)) {
    return {
      dockerfile: `FROM php:8.2-apache
COPY . /var/www/html/
RUN chown -R www-data:www-data /var/www/html
EXPOSE 80`,
      port: 80
    };
  }
  
  // Python project
  if (await fs.access(path.join(repoPath, 'requirements.txt')).then(() => true).catch(() => false)) {
    const detectedPort = port || 8000;
    return {
      dockerfile: `FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE ${detectedPort}
CMD ["python", "app.py"]`,
      port: detectedPort
    };
  }
  
  // Static HTML
  const detectedPort = port || 3000;
  return {
    dockerfile: `FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install -g serve
EXPOSE ${detectedPort}
CMD ["serve", ".", "-l", "${detectedPort}"]`,
    port: detectedPort
  };
}
