export const RENDER_CONFIG = {
  // Video output specs
  resolution: {
    hd: { width: 1440, height: 810, label: '1440p (HD)' },
    '4k': { width: 3840, height: 2160, label: '4K' },
    youtube: { width: 1920, height: 1080, label: '1080p (YouTube)' },
  },

  // Frame rates
  fps: {
    cinema: 24,
    standard: 30,
    smooth: 60,
  },

  // Codec presets
  codec: {
    h264: {
      name: 'h264',
      ext: 'mp4',
      label: 'H.264 (MP4)',
      quality: 'high-compatibility',
    },
    hevc: {
      name: 'hevc',
      ext: 'mp4',
      label: 'H.265 (HEVC)',
      quality: 'highest-compression',
    },
    prores: {
      name: 'prores',
      ext: 'mov',
      label: 'ProRes',
      quality: 'master-quality',
    },
  },

  // Video duration
  duration: {
    frames: 5400, // 180 seconds @ 30fps
    seconds: 180,
    minutes: 3,
  },

  // Audio mixing
  audio: {
    musicTrack: 'src/assets/audio/airs-ambient.wav',
    voiceOverTrack: 'src/assets/audio/airs-voiceover.wav',
    sfxDir: 'src/assets/audio/sfx',
  },

  // Export presets
  export: {
    youtube: {
      bitrate: '8000k',
      preset: 'slow',
      crf: 18,
      format: 'yuv420p',
    },
    social: {
      bitrate: '5000k',
      preset: 'medium',
      crf: 22,
      format: 'yuv420p',
    },
    web: {
      bitrate: '3000k',
      preset: 'fast',
      crf: 24,
      format: 'yuv420p',
    },
  },
};
