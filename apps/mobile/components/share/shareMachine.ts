import { assign, fromPromise, setup } from 'xstate';
import { shareText } from './shareTargets';
import type {
  PreparedShareImage,
  ShareContent,
  ShareContext,
  ShareEvent,
  ShareImage,
  ShareServices,
  SocialPlatform,
} from './share.types';

/**
 * The share flow, the same for medals, milestones and QR codes:
 *
 *   init ─► preparing (image) ─► idle.ready ◄──────────────────────────────┐
 *                                  │ SHARE ─► sharing ──────────────────────┤ cancel stays quiet
 *                                  │ COPY ──► copying ─► idle.copied (1.8 s)┤
 *                                  │ DOWNLOAD ─► downloading ───────────────┤
 *                                  │ SOCIAL X / LinkedIn / Facebook: composer link
 *                                  └ SOCIAL Instagram ─► instagram (share the image)
 *                                        └ error ─► instagramFallback (save it, open Instagram)
 *
 * Platform work lives in the injected services, so the flow is tested without a device.
 */

const COPIED_MS = 1800;

function isCancel(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function createShareMachine(services: ShareServices) {
  return setup({
    types: {
      context: {} as ShareContext,
      events: {} as ShareEvent,
      input: {} as { content: ShareContent },
    },
    actors: {
      prepareImage: fromPromise<PreparedShareImage, ShareImage>(({ input }) =>
        services.prepareImage(input)
      ),
      shareNative: fromPromise<void, { content: ShareContent; image: PreparedShareImage | null }>(
        ({ input }) => services.shareNative(input.content, input.image)
      ),
      copyText: fromPromise<void, string>(({ input }) => services.copyText(input)),
      downloadImage: fromPromise<void, { image: PreparedShareImage; fileName: string }>(
        ({ input }) => services.downloadImage(input.image, input.fileName)
      ),
    },
    guards: {
      hasImage: ({ context }) => Boolean(context.content.image),
      imageReady: ({ context }) => context.image !== null,
      isCancel: ({ event }) => isCancel((event as { error?: unknown }).error),
      isInstagram: ({ event }) => event.type === 'SOCIAL' && event.platform === 'Instagram',
    },
    actions: {
      openComposer: ({ context }, params: { platform: SocialPlatform }) =>
        services.openComposer(params.platform, shareText(context.content), context.content.url),
    },
  }).createMachine({
    id: 'share',
    initial: 'init',
    context: ({ input }) => ({
      content: input.content,
      image: null,
      imageStatus: input.content.image ? 'loading' : 'none',
      notice: null,
    }),
    states: {
      init: {
        always: [{ guard: 'hasImage', target: 'preparing' }, { target: 'idle' }],
      },
      preparing: {
        invoke: {
          src: 'prepareImage',
          input: ({ context }) => context.content.image as ShareImage,
          onDone: {
            target: 'idle',
            actions: assign({ image: ({ event }) => event.output, imageStatus: 'ready' }),
          },
          onError: { target: 'idle', actions: assign({ imageStatus: 'failed' }) },
        },
      },
      idle: {
        initial: 'ready',
        states: {
          ready: {},
          copied: {
            after: { [COPIED_MS]: { target: 'ready', actions: assign({ notice: null }) } },
          },
        },
        on: {
          SHARE: { target: 'sharing', actions: assign({ notice: null }) },
          COPY: { target: 'copying', actions: assign({ notice: null }) },
          DOWNLOAD: {
            guard: 'imageReady',
            target: 'downloading',
            actions: assign({ notice: null }),
          },
          SOCIAL: [
            {
              guard: 'isInstagram',
              target: 'instagram',
              actions: assign({ notice: null }),
            },
            {
              actions: [
                assign({ notice: null }),
                {
                  type: 'openComposer',
                  params: ({ event }) => ({ platform: event.platform }),
                },
              ],
            },
          ],
          DISMISS: { actions: assign({ notice: null }) },
        },
      },
      sharing: {
        invoke: {
          src: 'shareNative',
          input: ({ context }) => ({ content: context.content, image: context.image }),
          onDone: 'idle',
          onError: [
            { guard: 'isCancel', target: 'idle' },
            { target: 'idle', actions: assign({ notice: 'shareError' }) },
          ],
        },
      },
      copying: {
        invoke: {
          src: 'copyText',
          // An empty link counts as no link: copy the whole message instead.
          input: ({ context }) =>
            context.content.url ? context.content.url : shareText(context.content),
          onDone: { target: 'idle.copied', actions: assign({ notice: 'copied' }) },
          onError: { target: 'idle', actions: assign({ notice: 'copyError' }) },
        },
      },
      downloading: {
        invoke: {
          src: 'downloadImage',
          input: ({ context }) => ({
            image: context.image as PreparedShareImage,
            fileName: context.content.image?.fileName ?? 'airs.png',
          }),
          onDone: { target: 'idle', actions: assign({ notice: 'downloaded' }) },
          onError: [
            { guard: 'isCancel', target: 'idle' },
            { target: 'idle', actions: assign({ notice: 'downloadError' }) },
          ],
        },
      },
      // Instagram has no web composer: share the image to the app when the device can.
      instagram: {
        invoke: {
          src: 'shareNative',
          input: ({ context }) => ({ content: context.content, image: context.image }),
          onDone: 'idle',
          onError: [{ guard: 'isCancel', target: 'idle' }, { target: 'instagramFallback' }],
        },
      },
      // Otherwise save the image and open Instagram so the person can post it.
      instagramFallback: {
        always: {
          target: 'idle',
          actions: [
            ({ context }) => {
              if (context.image) {
                void services
                  .downloadImage(context.image, context.content.image?.fileName ?? 'airs.png')
                  .catch(() => {});
              }
            },
            { type: 'openComposer', params: { platform: 'Instagram' } },
            assign({ notice: 'instagramHint' }),
          ],
        },
      },
    },
  });
}
