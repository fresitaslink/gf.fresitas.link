import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lat, lng, is_available } = await req.json();

    // Find driver by email
    const drivers = await base44.asServiceRole.entities.Driver.filter({ user_email: user.email });
    if (!drivers.length) {
      return Response.json({ error: 'Driver not found' }, { status: 404 });
    }

    const driver = drivers[0];

    // Update location & availability
    await base44.asServiceRole.entities.Driver.update(driver.id, {
      current_lat: lat,
      current_lng: lng,
      last_location_update: new Date().toISOString(),
      ...(typeof is_available !== 'undefined' && { is_available }),
    });

    // Broadcast to nearby customers (simulation)
    console.log(`Driver ${user.email} updated location: ${lat}, ${lng}`);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});