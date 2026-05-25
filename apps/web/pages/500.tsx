import StaticErrorPage from '../components/StaticErrorPage';

export default function Custom500() {
  return (
    <StaticErrorPage
      code={500}
      eyebrow='SERVER ERROR'
      title='Something broke.'
      message='The request could not be completed. Try again in a moment or return to the homepage.'
      actionLabel='Go home'
      actionHref='/'
    />
  );
}
