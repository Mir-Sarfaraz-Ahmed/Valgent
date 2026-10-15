import * as fs from 'fs/promises';
import * as path from 'path';
import { RepositoryDescriptor } from '../shared/types';

export interface ProjectMap {
  languages: string[];
  frameworks: string[];
  packageManagers: string[];
  entryPoints: string[];
  dependencies: Record<string, string>;
  directories: string[];
  scripts: Record<string, string>;
}

export class ProjectMapper {
  static async map(descriptor: RepositoryDescriptor): Promise<ProjectMap> {
    const rootPath = descriptor.local_path;
    const map: ProjectMap = {
      languages: [],
      frameworks: [],
      packageManagers: [],
      entryPoints: [],
      dependencies: {},
      directories: [],
      scripts: {}
    };

    // Very basic mapping for V0.1
    const entries = await fs.readdir(rootPath, { withFileTypes: true });
    
    let hasPackageJson = false;

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!['.git', 'node_modules'].includes(entry.name)) {
          map.directories.push(entry.name);
        }
      } else {
        if (entry.name === 'package.json') {
          hasPackageJson = true;
        }
        if (entry.name === 'yarn.lock') {
          if (!map.packageManagers.includes('yarn')) map.packageManagers.push('yarn');
        }
        if (entry.name === 'pnpm-lock.yaml') {
          if (!map.packageManagers.includes('pnpm')) map.packageManagers.push('pnpm');
        }
        if (entry.name === 'bun.lock' || entry.name === 'bun.lockb') {
          if (!map.packageManagers.includes('bun')) map.packageManagers.push('bun');
        }
        if (entry.name === 'package-lock.json') {
          if (!map.packageManagers.includes('npm')) map.packageManagers.push('npm');
        }
        if (entry.name.endsWith('.ts')) {
          if (!map.languages.includes('TypeScript')) map.languages.push('TypeScript');
        }
        if (entry.name.endsWith('.js')) {
          if (!map.languages.includes('JavaScript')) map.languages.push('JavaScript');
        }
        if (['index.js', 'server.js', 'main.js', 'app.js', 'index.ts', 'server.ts', 'main.ts', 'app.ts'].includes(entry.name)) {
          map.entryPoints.push(entry.name);
        }
      }
    }

    if (hasPackageJson) {
      try {
        const pkgContent = await fs.readFile(path.join(rootPath, 'package.json'), 'utf-8');
        const pkg = JSON.parse(pkgContent);
        if (pkg.scripts) {
          map.scripts = { ...pkg.scripts };
        }
        if (pkg.dependencies) {
          map.dependencies = { ...pkg.dependencies };
          
          // Detect frameworks from dependencies
          if (pkg.dependencies['express']) map.frameworks.push('Express');
          if (pkg.dependencies['react']) map.frameworks.push('React');
          if (pkg.dependencies['next']) map.frameworks.push('Next.js');
          if (pkg.dependencies['vue']) map.frameworks.push('Vue');
        }
      } catch (e) {
        console.error('Error parsing package.json', e);
      }
    }

    return map;
  }
}
