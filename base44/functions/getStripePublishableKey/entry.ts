/**
 * Returns the Stripe publishable key for client-side tokenization.
 * Safe to expose — publishable keys are designed for browser use.
 */
Deno.serve(async () => {
  const pk = Deno.env.get('STRIPE_PUBLISHABLE_KEY');
  if (!pk) return Response.json({ error: 'Stripe publishable key not configured' }, { status: 500 });
  return Response.json({ publishable_key: pk });
});