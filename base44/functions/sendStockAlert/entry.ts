import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { low_stock = [] } = body;

    const [settingsList] = await Promise.all([
      base44.asServiceRole.entities.StoreSettings.list(),
    ]);

    const settings = settingsList[0] || {};
    const adminEmail = settings.admin_email;

    if (!adminEmail) {
      return Response.json({ error: 'No admin email configured in StoreSettings' }, { status: 400 });
    }

    const criticalItems = low_stock.filter(i => i.stock === 0);
    const lowItems = low_stock.filter(i => i.stock > 0);

    const rows = low_stock.map(item => `
      <tr style="border-bottom: 1px solid #f0f0f0;">
        <td style="padding: 10px 14px; font-weight: 600;">${item.name}</td>
        <td style="padding: 10px 14px; text-align: center;">
          <span style="
            background: ${item.stock === 0 ? '#FEE2E2' : '#FEF3C7'};
            color: ${item.stock === 0 ? '#DC2626' : '#D97706'};
            padding: 2px 10px; border-radius: 20px; font-weight: bold; font-size: 13px;
          ">${item.stock === 0 ? '⚠️ AGOTADO' : `${item.stock} restantes`}</span>
        </td>
        <td style="padding: 10px 14px; text-align: center; color: #999; font-size: 13px;">Mín: ${item.threshold}</td>
      </tr>
    `).join('');

    const html = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #5C2D0E, #8B4513); padding: 32px 30px; text-align: center;">
          <p style="font-size: 36px; margin: 0;">🍓⚠️</p>
          <h1 style="color: #FDE8EC; font-size: 22px; margin: 12px 0 4px;">Alerta de Stock Bajo</h1>
          <p style="color: rgba(253,232,236,0.7); margin: 0; font-size: 14px;">Fresitas G&F — Sistema de Inventario</p>
        </div>

        <div style="padding: 28px 30px;">
          ${criticalItems.length > 0 ? `
            <div style="background: #FEE2E2; border: 1px solid #FECACA; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
              <p style="color: #DC2626; font-weight: bold; margin: 0 0 4px; font-size: 15px;">🚨 ${criticalItems.length} ingrediente(s) AGOTADO(S)</p>
              <p style="color: #EF4444; margin: 0; font-size: 13px;">${criticalItems.map(i => i.name).join(', ')} — Los productos vinculados fueron desactivados automáticamente.</p>
            </div>
          ` : ''}

          <p style="color: #555; margin: 0 0 16px; font-size: 14px;">
            Los siguientes ingredientes están por debajo del umbral mínimo de stock:
          </p>

          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background: #FDE8EC;">
                <th style="padding: 10px 14px; text-align: left; color: #E8294A; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Ingrediente</th>
                <th style="padding: 10px 14px; text-align: center; color: #E8294A; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Stock Actual</th>
                <th style="padding: 10px 14px; text-align: center; color: #E8294A; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Umbral</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <div style="margin-top: 24px; background: #F9FAFB; border-radius: 12px; padding: 16px;">
            <p style="color: #374151; font-weight: bold; margin: 0 0 8px; font-size: 14px;">📋 Acciones Recomendadas:</p>
            <ul style="color: #6B7280; font-size: 13px; margin: 0; padding-left: 20px; line-height: 2;">
              <li>Reabastecer los ingredientes agotados</li>
              <li>Verificar proveedores disponibles</li>
              <li>Actualizar el inventario en el panel de admin</li>
              ${criticalItems.length > 0 ? '<li>Reactivar productos cuando el stock esté disponible</li>' : ''}
            </ul>
          </div>

          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">
            Este mensaje fue generado automáticamente por el sistema de inventario de Fresitas G&F.
          </p>
        </div>
      </div>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: adminEmail,
      subject: `🚨 Alerta de Stock — ${criticalItems.length > 0 ? `${criticalItems.length} agotados, ` : ''}${lowItems.length} ingredientes bajos`,
      body: html,
    });

    // Also notify active managers with inventory permissions
    const managerPerms = await base44.asServiceRole.entities.ManagerPermissions.filter({ is_active: true });
    for (const perm of managerPerms) {
      if (perm.can_manage_products && perm.user_email && perm.user_email !== adminEmail) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: perm.user_email,
          subject: `🚨 Alerta de Stock — Fresitas G&F`,
          body: html,
        }).catch(() => {});
      }
    }

    return Response.json({ success: true, sent_to: adminEmail, items_alerted: low_stock.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});