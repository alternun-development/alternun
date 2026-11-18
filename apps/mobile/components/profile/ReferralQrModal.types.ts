/** What react-native-qrcode-svg hands to `getRef`: the SVG, which renders itself to PNG. */
export interface QrSvgRef {
  toDataURL: (callback: (base64: string) => void) => void;
}
