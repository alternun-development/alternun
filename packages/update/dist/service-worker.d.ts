export declare const RELEASE_MANIFEST_FILENAME = 'alternun-release-manifest.json';
export declare const RELEASE_WORKER_FILENAME = 'alternun-release-worker.js';
export declare const RELEASE_CHECK_MESSAGE_TYPE = 'ALTERNUN_RELEASE_CHECK';
export declare const RELEASE_SKIP_WAITING_MESSAGE_TYPE = 'ALTERNUN_RELEASE_SKIP_WAITING';
export declare const RELEASE_UPDATE_AVAILABLE_MESSAGE_TYPE = 'ALTERNUN_RELEASE_UPDATE_AVAILABLE';
export interface RenderReleaseWorkerOptions {
  currentVersion: string;
  manifestUrl?: string;
}
export declare function renderReleaseWorkerSource(options: RenderReleaseWorkerOptions): string;
