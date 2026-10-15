"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const engine_1 = require("../../src/evidence/engine");
describe('EvidenceEngine', () => {
    it('generates unique evidence IDs and hashes content', () => {
        const engine = new engine_1.EvidenceEngine();
        const ev1 = engine.addEvidence('SOURCE_CODE', 'src/index.js', 'console.log("hello")', 'desc1', 'repo');
        const ev2 = engine.addEvidence('SOURCE_CODE', 'src/index.js', 'console.log("world")', 'desc2', 'repo');
        expect(ev1.evidence_id).toMatch(/^EVD-/);
        expect(ev1.evidence_id).not.toEqual(ev2.evidence_id);
        expect(ev1.content_hash).not.toEqual(ev2.content_hash);
        expect(engine.getEvidence()).toHaveLength(2);
    });
});
