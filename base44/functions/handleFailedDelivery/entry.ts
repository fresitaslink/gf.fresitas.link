import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { order_id, failure_reason, photo_url, driver_email } = await req.json();

    if (!order_id || !failure_reason) {
      return Response.json({ error: 'order_id and failure_reason required' }, { status: 400 });
    }

    // Get order details
    const order = await base44.entities.Order.read(order_id);
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get driver info
    const driver = await base44.entities.Driver.read(driver_email.replace('@', '_'));
    const allDrivers = await base44.entities.Driver.list();
    const driverData = allDrivers.find(d => d.user_email === driver_email) || { full_name: 'Unknown Driver' };

    // Create delivery failure record
    const failureRecord = {
      order_id,
      driver_email,
      failure_reason,
      photo_url,
      failure_timestamp: new Date().toISOString(),
      status: 'reported'
    };

    // Get store settings for admin contact
    const storeSettings = await base44.asServiceRole.entities.StoreSettings.list();
    const adminEmail = storeSettings?.[0]?.admin_email;
    const whatsappNumber = storeSettings?.[0]?.whatsapp_number;

    // Send SMS notification to driver
    if (driverData.phone) {
      try {
        await base44.integrations.Core.SendSMS({
          phone: driverData.phone,
          message: `⚠️ Entrega fallida registrada: Orden #${order.tracking_code}. Razón: ${failure_reason}. Por favor contacta a soporte.`
        });
      } catch (e) {
        console.log('SMS send failed:', e.message);
      }
    }

    // Send Push notification
    try {
      await base44.functions.invoke('sendPushNotification', {
        user_email: driver_email,
        title: '⚠️ Entrega Fallida Reportada',
        body: `Orden #${order.tracking_code}: ${failure_reason}`,
        data: { order_id }
      });
    } catch (e) {
      console.log('Push failed:', e.message);
    }

    // Send email alert to admin
    if (adminEmail) {
      try {
        await base44.integrations.Core.SendEmail({
          to: adminEmail,
          subject: `🚨 Entrega Fallida: Orden #${order.tracking_code}`,
          body: `
Conductor: ${driverData.full_name} (${driver_email})
Orden: #${order.tracking_code}
Cliente: ${order.customer_name} - ${order.customer_address}
Razón del Fallo: ${failure_reason}
Hora: ${new Date().toLocaleString('es-MX')}

${photo_url ? `Foto de Evidencia: ${photo_url}` : 'Sin foto de evidencia'}

Acciones Recomendadas:
1. Revisar el reporte de fotografía si está disponible
2. Contactar al cliente para reprogramar entrega
3. Evaluar desempeño del conductor
          `
        });
      } catch (e) {
        console.log('Email send failed:', e.message);
      }
    }

    return Response.json({
      success: true,
      failure_record: failureRecord,
      notifications_sent: {
        sms: !!driverData.phone,
        push: true,
        email: !!adminEmail
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});