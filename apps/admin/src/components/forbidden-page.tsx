export function ForbiddenPage() {
  return (
    <section className='panel panel-tight'>
      <span className='panel-label'>Access denied</span>
      <h2>You do not have permission for this section.</h2>
      <p>
        Refine blocked this route through the access control provider. Final authorization still
        belongs to the API.
      </p>
    </section>
  );
}
