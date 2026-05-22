import type { NextPage, NextPageContext } from 'next';

import StaticErrorPage from '../components/StaticErrorPage';

interface ErrorPageProps {
  statusCode?: number;
}

const ErrorPage: NextPage<ErrorPageProps> = ({ statusCode }) => {
  const code = statusCode ?? 500;
  const isNotFound = code === 404;

  return (
    <StaticErrorPage
      code={code}
      eyebrow={isNotFound ? 'NOT FOUND' : 'SERVER ERROR'}
      title={isNotFound ? 'Page missing.' : 'Something broke.'}
      message={
        isNotFound
          ? 'The requested page does not exist. Return to the homepage or try a different route.'
          : 'The request could not be completed. Try again in a moment or return to the homepage.'
      }
      actionLabel='Go home'
      actionHref='/'
    />
  );
};

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 404;
  return { statusCode };
};

export default ErrorPage;
