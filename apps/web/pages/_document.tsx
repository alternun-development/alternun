import Document, {
  Head,
  Html,
  Main,
  NextScript,
  type DocumentContext,
  type DocumentInitialProps,
} from 'next/document';

export default class WebDocument extends Document {
  static override async getInitialProps(
    ctx: DocumentContext
  ): Promise<DocumentInitialProps> {
    return await Document.getInitialProps(ctx);
  }

  override render() {
    return (
      <Html lang='es'>
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
