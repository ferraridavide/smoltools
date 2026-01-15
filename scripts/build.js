#!/usr/bin/env node

/**
 * Generic build script for smoltools monorepo
 * 
 * This script auto-discovers and builds all tools:
 * - Vite/npm projects (have package.json with build script) → runs npm install && npm run build
 * - Static projects (just HTML/CSS/JS files) → copies to dist/
 * 
 * To add a new tool, just create a directory with either:
 * 1. A package.json with a "build" script (for Vite/React apps)
 * 2. Static files (for simple HTML tools)
 */

import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Directories to ignore (not tools)
const IGNORE_DIRS = ['node_modules', 'dist', 'scripts', '.git', '.github'];

async function getDirectories() {
    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    return entries
        .filter(entry => entry.isDirectory() && !IGNORE_DIRS.includes(entry.name) && !entry.name.startsWith('.'))
        .map(entry => entry.name);
}

async function hasPackageJsonWithBuild(dir) {
    try {
        const pkgPath = path.join(rootDir, dir, 'package.json');
        const content = await fs.readFile(pkgPath, 'utf8');
        const pkg = JSON.parse(content);
        return pkg.scripts?.build !== undefined;
    } catch {
        return false;
    }
}

async function runCommand(command, args, cwd) {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, { cwd, stdio: 'inherit', shell: true });
        proc.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error(`Command "${command} ${args.join(' ')}" exited with code ${code}`));
        });
        proc.on('error', reject);
    });
}

async function copyDir(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            await copyDir(srcPath, destPath);
        } else {
            await fs.copyFile(srcPath, destPath);
        }
    }
}

async function buildProject(dir) {
    const projectPath = path.join(rootDir, dir);
    const hasBuildScript = await hasPackageJsonWithBuild(dir);

    if (hasBuildScript) {
        console.log(`\n📦 Building ${dir} (npm project)...`);
        await runCommand('npm', ['install'], projectPath);
        await runCommand('npm', ['run', 'build'], projectPath);
    } else {
        console.log(`\n📋 Copying ${dir} (static files)...`);
        const destPath = path.join(rootDir, 'dist', dir);
        await copyDir(projectPath, destPath);
    }

    console.log(`✅ ${dir} done`);
}

async function main() {
    console.log('🔧 smoltools build script\n');
    console.log('Discovering projects...');

    const dirs = await getDirectories();
    console.log(`Found ${dirs.length} potential projects: ${dirs.join(', ')}`);

    // Ensure dist directory exists
    await fs.mkdir(path.join(rootDir, 'dist'), { recursive: true });

    for (const dir of dirs) {
        try {
            await buildProject(dir);
        } catch (error) {
            console.error(`❌ Failed to build ${dir}:`, error.message);
            process.exit(1);
        }
    }

    console.log('\n🎉 All projects built successfully!');
}

main().catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
});
