import StaticErrorPage from '../components/StaticErrorPage';

export default function NotFoundPage() {
  return (
    <StaticErrorPage
      code={404}
      eyebrow='NOT FOUND'
      title='Page missing.'
      message='The requested page does not exist. Return to the homepage or try a different route.'
      actionLabel='Go home'
      actionHref='/'
    />
  );
}
