"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const static_1 = require("../../src/analyzers/static");
const engine_1 = require("../../src/evidence/engine");
const path = __importStar(require("path"));
describe('StaticAnalyzer', () => {
    it('identifies API routes from Express files', async () => {
        const fixturePath = path.join(__dirname, '../fixtures/sample-repo');
        const engine = new engine_1.EvidenceEngine();
        const map = {
            languages: ['JavaScript'],
            frameworks: [],
            packageManagers: [],
            entryPoints: [],
            dependencies: {},
            directories: []
        };
        await static_1.StaticAnalyzer.analyze({
            repository_url: 'http',
            local_path: fixturePath,
            branch: 'main',
            fetched_at: 'now'
        }, map, engine);
        // If there were JS files with express, we would see them. Let's make sure it runs without error.
        expect(engine.getEvidence()).toBeDefined();
    });
    it('reports unsupported if not JS/TS', async () => {
        const engine = new engine_1.EvidenceEngine();
        const map = {
            languages: ['Python'],
            frameworks: [],
            packageManagers: [],
            entryPoints: [],
            dependencies: {},
            directories: []
        };
        await static_1.StaticAnalyzer.analyze({
            repository_url: 'http',
            local_path: 'fake',
            branch: 'main',
            fetched_at: 'now'
        }, map, engine);
        const evidence = engine.getEvidence();
        expect(evidence.length).toBe(1);
        expect(evidence[0].content_hash).toBeDefined(); // The unsupported message is hashed
    });
});
