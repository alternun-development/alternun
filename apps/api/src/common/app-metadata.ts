// Version injected at build time via esbuild --define flag
// Format: "1.0.163" (will be replaced with actual version from package.json)
declare const __VERSION__: string;

export const APP_NAME = '@alternun/api';
export const APP_VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : '1.0.0';
