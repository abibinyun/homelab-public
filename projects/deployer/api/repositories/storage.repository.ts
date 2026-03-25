import fs from 'fs/promises';
import path from 'path';
import config from '../config/index.js';
import { Project, User } from '../types/index.js';
import logger from '../utils/logger.js';
import db from '../db/index.js';
import postgresRepository from './postgres.repository.js';

const DATA_DIR = config.dataDir;
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

class StorageRepository {
  private async ensureDataDir(): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }

  private async readJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      logger.debug(`File not found or invalid: ${filePath}, using default`);
      return defaultValue;
    }
  }

  private async writeJsonFile<T>(filePath: string, data: T): Promise<void> {
    await this.ensureDataDir();
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  // Projects - use PostgreSQL if available, fallback to JSON
  async getProjects(userId?: number): Promise<Project[]> {
    if (db.isConnected()) {
      return postgresRepository.getProjects(userId);
    }
    const projects = await this.readJsonFile<Project[]>(PROJECTS_FILE, []);
    return userId ? projects.filter(p => p.userId === userId) : projects;
  }

  async saveProjects(projects: Project[]): Promise<void> {
    if (db.isConnected()) {
      return;
    }
    await this.writeJsonFile(PROJECTS_FILE, projects);
  }

  async getProjectByName(name: string, userId?: number): Promise<Project | null> {
    if (db.isConnected()) {
      return postgresRepository.getProjectByName(name, userId);
    }
    const projects = await this.getProjects(userId);
    return projects.find(p => p.name === name) || null;
  }

  async createProject(project: Project): Promise<void> {
    if (db.isConnected()) {
      return postgresRepository.createProject(project);
    }
    const projects = await this.getProjects();
    projects.push(project);
    await this.saveProjects(projects);
  }

  async updateProject(name: string, updates: Partial<Project>): Promise<void> {
    if (db.isConnected()) {
      return postgresRepository.updateProject(name, updates);
    }
    const projects = await this.getProjects();
    const index = projects.findIndex(p => p.name === name);
    if (index >= 0) {
      projects[index] = { ...projects[index], ...updates, updatedAt: new Date().toISOString() };
      await this.saveProjects(projects);
    }
  }

  async deleteProject(name: string, userId?: number): Promise<void> {
    if (db.isConnected()) {
      return postgresRepository.deleteProject(name, userId);
    }
    const projects = await this.getProjects();
    const filtered = userId 
      ? projects.filter(p => !(p.name === name && p.userId === userId))
      : projects.filter(p => p.name !== name);
    await this.saveProjects(filtered);
  }

  // Users - use PostgreSQL if available, fallback to JSON
  async getUsers(): Promise<User[]> {
    if (db.isConnected()) {
      return postgresRepository.getUsers();
    }
    return this.readJsonFile<User[]>(USERS_FILE, []);
  }

  async saveUsers(users: User[]): Promise<void> {
    if (db.isConnected()) {
      return;
    }
    await this.writeJsonFile(USERS_FILE, users);
  }

  async getUserByUsername(username: string): Promise<User | null> {
    if (db.isConnected()) {
      return postgresRepository.getUserByUsername(username);
    }
    const users = await this.getUsers();
    return users.find(u => u.username === username) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    if (db.isConnected()) {
      return postgresRepository.getUserByEmail(email);
    }
    const users = await this.getUsers();
    return users.find(u => u.email === email) || null;
  }

  async getUserByVerificationToken(token: string): Promise<User | null> {
    if (db.isConnected()) {
      return postgresRepository.getUserByVerificationToken(token);
    }
    const users = await this.getUsers();
    return users.find(u => 
      u.verification_token === token && 
      u.verification_token_expires && 
      new Date(u.verification_token_expires) > new Date()
    ) || null;
  }

  async getUserByResetToken(token: string): Promise<User | null> {
    if (db.isConnected()) {
      return postgresRepository.getUserByResetToken(token);
    }
    const users = await this.getUsers();
    return users.find(u => 
      u.reset_token === token && 
      u.reset_token_expires && 
      new Date(u.reset_token_expires) > new Date()
    ) || null;
  }

  async createUser(user: User): Promise<void> {
    if (db.isConnected()) {
      return postgresRepository.createUser(user);
    }
    const users = await this.getUsers();
    users.push(user);
    await this.saveUsers(users);
  }

  async updateUser(username: string, updates: Partial<User>): Promise<void> {
    if (db.isConnected()) {
      return postgresRepository.updateUser(username, updates);
    }
    const users = await this.getUsers();
    const index = users.findIndex(u => u.username === username);
    if (index >= 0) {
      users[index] = { ...users[index], ...updates, updatedAt: new Date().toISOString() };
      await this.saveUsers(users);
    }
  }

  // Sessions - always use JSON for now (will use Redis later)
  async getSessions(): Promise<Map<string, any>> {
    const data = await this.readJsonFile<[string, any][]>(SESSIONS_FILE, []);
    return new Map(data);
  }

  async saveSessions(sessions: Map<string, any>): Promise<void> {
    const data = Array.from(sessions.entries());
    await this.writeJsonFile(SESSIONS_FILE, data);
  }
}

export default new StorageRepository();
