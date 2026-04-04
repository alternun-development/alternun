"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeReleaseVersion = normalizeReleaseVersion;
exports.createReleaseManifest = createReleaseManifest;
exports.parseReleaseManifest = parseReleaseManifest;
exports.serializeReleaseManifest = serializeReleaseManifest;
function normalizeReleaseVersion(value) {
    const version = value === null || value === void 0 ? void 0 : value.trim();
    if (!version) {
        throw new Error('A release version is required.');
    }
    return version;
}
function createReleaseManifest(version) {
    return {
        version: normalizeReleaseVersion(version),
    };
}
function parseReleaseManifest(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }
    const candidate = value;
    if (typeof candidate.version !== 'string') {
        return null;
    }
    const version = candidate.version.trim();
    if (!version) {
        return null;
    }
    return { version };
}
function serializeReleaseManifest(manifest) {
    return `${JSON.stringify(manifest, null, 2)}\n`;
}
