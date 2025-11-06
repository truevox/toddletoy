/**
 * Tests for version automation system
 */

import packageJson from '../package.json';
import { ErrorReporter } from '../src/utils/ErrorReporter.js';
import fs from 'fs';
import path from 'path';

describe('Version Automation', () => {
    describe('Package.json Version', () => {
        test('should have valid semantic version', () => {
            expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+$/);
        });

        test('version should be accessible from code', () => {
            expect(packageJson.version).toBeTruthy();
            expect(typeof packageJson.version).toBe('string');
        });

        test('version should follow semantic versioning', () => {
            const parts = packageJson.version.split('.');
            expect(parts).toHaveLength(3);
            parts.forEach(part => {
                expect(parseInt(part)).toBeGreaterThanOrEqual(0);
                expect(isNaN(parseInt(part))).toBe(false);
            });
        });
    });

    describe('Version Verification Script', () => {
        test('verify-version-bump.js should exist', () => {
            const scriptPath = path.join(__dirname, '../scripts/verify-version-bump.js');
            expect(fs.existsSync(scriptPath)).toBe(true);
        });

        test('verify-version-bump.js should be executable', () => {
            const scriptPath = path.join(__dirname, '../scripts/verify-version-bump.js');
            const stats = fs.statSync(scriptPath);
            // Check if file has execute permission
            expect(stats.mode & fs.constants.S_IXUSR).toBeTruthy();
        });

        test('script should have proper shebang', () => {
            const scriptPath = path.join(__dirname, '../scripts/verify-version-bump.js');
            const content = fs.readFileSync(scriptPath, 'utf8');
            expect(content.startsWith('#!/usr/bin/env node')).toBe(true);
        });
    });

    describe('Pre-commit Hook', () => {
        test('pre-commit hook should exist', () => {
            const hookPath = path.join(__dirname, '../.husky/pre-commit');
            expect(fs.existsSync(hookPath)).toBe(true);
        });

        test('pre-commit hook should call verification script', () => {
            const hookPath = path.join(__dirname, '../.husky/pre-commit');
            const content = fs.readFileSync(hookPath, 'utf8');
            expect(content).toContain('verify-version-bump.js');
        });
    });

    describe('ErrorReporter Integration', () => {
        test('ErrorReporter should include version', () => {
            const mockError = new Error('Test error');
            const report = ErrorReporter.report(mockError, { test: true });

            expect(report).toHaveProperty('version');
            expect(report.version).toBe(packageJson.version);
            expect(report).toHaveProperty('timestamp');
            expect(report).toHaveProperty('error');
            expect(report.error.message).toBe('Test error');
        });

        test('ErrorReporter.getVersion should return current version', () => {
            expect(ErrorReporter.getVersion()).toBe(packageJson.version);
        });

        test('ErrorReporter.warn should create warning report with version', () => {
            const report = ErrorReporter.warn('Test warning', { test: true });

            expect(report).toHaveProperty('version');
            expect(report.version).toBe(packageJson.version);
            expect(report.level).toBe('warning');
            expect(report.message).toBe('Test warning');
        });
    });

    describe('Version Display Integration', () => {
        test('game.js should import packageJson', () => {
            const gamePath = path.join(__dirname, '../src/game.js');
            const content = fs.readFileSync(gamePath, 'utf8');
            expect(content).toContain("import packageJson from '../package.json'");
        });

        test('ConfigScreen.js should display version', () => {
            const configPath = path.join(__dirname, '../src/config/ConfigScreen.js');
            const content = fs.readFileSync(configPath, 'utf8');
            // Version is displayed via __APP_VERSION__ or similar
            expect(content).toContain('app-version');
        });
    });
});
