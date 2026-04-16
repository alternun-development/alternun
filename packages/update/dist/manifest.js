"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeReleaseVersion = normalizeReleaseVersion;
exports.createReleaseManifest = createReleaseManifest;
exports.parseReleaseManifest = parseReleaseManifest;
exports.serializeReleaseManifest = serializeReleaseManifest;
exports.compareReleaseVersions = compareReleaseVersions;
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
/**
 * Compare two semantic versions (X.Y.Z format).
 * Returns: 1 if versionA > versionB, -1 if versionA < versionB, 0 if equal.
 */
function compareReleaseVersions(versionA, versionB) {
    const parseVersion = (v) => {
        var _a, _b, _c;
        const parts = v.split('.').map((p) => parseInt(p, 10) || 0);
        return { major: (_a = parts[0]) !== null && _a !== void 0 ? _a : 0, minor: (_b = parts[1]) !== null && _b !== void 0 ? _b : 0, patch: (_c = parts[2]) !== null && _c !== void 0 ? _c : 0 };
    };
    const a = parseVersion(versionA);
    const b = parseVersion(versionB);
    if (a.major !== b.major)
        return a.major > b.major ? 1 : -1;
    if (a.minor !== b.minor)
        return a.minor > b.minor ? 1 : -1;
    if (a.patch !== b.patch)
        return a.patch > b.patch ? 1 : -1;
    return 0;
}
