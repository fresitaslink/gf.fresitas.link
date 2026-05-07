import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const key = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!key) return Response.json({ error: 'Maps key not configured' }, { status: 500 });

    return Response.json({ apiKey: key });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});