import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = './data';
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

interface Project {
  name: string;
  gitUrl: string;
  subdomain: string;
  env: Record<string, string>;
  port: number;
  gitToken?: string;
  webhookSecret?: string;
  createdAt: string;
}

interface Users {
  username: string;
  password: string;
  createdAt?: string;
}

interface UserArray extends Array<Users> {}

export async function loadProjects(): Promise<Project[]> {
  try {
    const data = await fs.readFile(PROJECTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveProjects(projects: Project[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(PROJECTS_FILE, JSON.stringify(projects, null, 2));
}

export async function loadUsers(): Promise<UserArray | null> {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function saveUsers(users: UserArray): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

export async function loadSessions(): Promise<Map<string, any>> {
  try {
    const data = await fs.readFile(SESSIONS_FILE, 'utf-8');
    return new Map(JSON.parse(data));
  } catch {
    return new Map();
  }
}

export async function saveSessions(sessions: Map<string, any>): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const sessionsArray = Array.from(sessions.entries());
  await fs.writeFile(SESSIONS_FILE, JSON.stringify(sessionsArray, null, 2));
}
