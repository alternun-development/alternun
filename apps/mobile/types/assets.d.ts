declare module '*.mp4' {
  const resource: number | { uri: string; src?: string; default?: unknown };
  export default resource;
}
