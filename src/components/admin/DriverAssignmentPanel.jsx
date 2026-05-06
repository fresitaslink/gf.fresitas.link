import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Zap, Loader2, UserCheck, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Manual + Auto driver assignment panel.
 * Source of truth = User entity with role='delivery' (auto-creates Driver record if missing).
 * Writes assigned_driver_email directly to Order so driver app sees it.
 */
export default function DriverAssignmentPanel({ orders = [] }) {
  const [deliveryUsers, setDeliveryUsers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [assigningId, setAssigningId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [users, driverRecords] = await Promise.all([
        base44.entities.User.filter({ role: 'delivery' }),
        base44.entities.Driver.list(),
      ]);
      setDeliveryUsers(users);
      setDrivers(driverRecords);
    } catch (err) {
      toast.error('Error cargando datos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Match users with their driver profile (or null if missing)
  const getDriverForUser = (userEmail) => drivers.find(d => d.user_email === userEmail);

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    if (!lat1 || !lat2) return 999;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Ensures a Driver record exists for a delivery user
  const ensureDriverProfile = async (deliveryUser) => {
    let driverProfile = getDriverForUser(deliveryUser.email);
    if (!driverProfile) {
      driverProfile = await base44.entities.Driver.create({
        user_email: deliveryUser.email,
        full_name: deliveryUser.full_name || deliveryUser.email,
        phone: '',
        is_active: true,
        is_available: true,
        average_rating: 5.0,
        rating_count: 0,
        total_deliveries: 0,
      });
      setDrivers(prev => [...prev, driverProfile]);
      toast.info(`Perfil de conductor creado para ${deliveryUser.full_name || deliveryUser.email}`);
    }
    return driverProfile;
  };

  // Assigns an order to a delivery user (creates Driver profile if missing)
  const assignOrder = async (order, deliveryUser) => {
    setAssigningId(order.id);
    try {
      const driverProfile = await ensureDriverProfile(deliveryUser);

      const distance = calculateDistance(
        driverProfile.current_lat, driverProfile.current_lng,
        order.delivery_lat, order.delivery_lng
      );
      const estimatedTime = Math.ceil(distance / 25 * 60);

      // Generate a 4-digit PIN if missing
      const pin = order.verification_pin || String(Math.floor(1000 + Math.random() * 9000));

      // Update Order — this is what the driver app reads
      await base44.entities.Order.update(order.id, {
        assigned_driver_email: deliveryUser.email,
        assigned_driver_name: driverProfile.full_name || deliveryUser.full_name,
        assigned_driver_photo: driverProfile.photo_url || '',
        assigned_driver_rating: driverProfile.average_rating || 5,
        verification_pin: pin,
        status: order.status === 'pending' ? 'confirmed' : order.status,
      });

      // Create assignment record (audit trail)
      const me = await base44.auth.me().catch(() => null);
      await base44.entities.DriverAssignment.create({
        order_id: order.id,
        driver_email: deliveryUser.email,
        driver_name: driverProfile.full_name || deliveryUser.full_name,
        driver_photo: driverProfile.photo_url || '',
        driver_rating: driverProfile.average_rating || 5,
        assignment_status: 'active',
        delivery_lat: order.delivery_lat,
        delivery_lng: order.delivery_lng,
        estimated_distance_km: distance,
        estimated_duration_minutes: estimatedTime,
        assignment_method: 'manual',
        assigned_by_email: me?.email,
      });

      // Create delivery verification record so PIN/photo flow works
      await base44.entities.DeliveryVerification.create({
        order_id: order.id,
        driver_email: deliveryUser.email,
        customer_email: order.user_email || '',
        verification_pin: pin,
        verification_status: 'pending',
      });

      // Notify customer with PIN
      if (order.user_email) {
        await base44.entities.Notification.create({
          user_email: order.user_email,
          title_es: 'Tu repartidor ha sido asignado',
          title_en: 'Your driver has been assigned',
          message_es: `${driverProfile.full_name} entregará tu pedido. Tu código de verificación es: ${pin}`,
          message_en: `${driverProfile.full_name} will deliver your order. Verification code: ${pin}`,
          type: 'order_update',
          link: '/orders',
        }).catch(() => {});
      }

      toast.success(`Asignado a ${driverProfile.full_name || deliveryUser.email}`);
      setSelectedOrder(null);
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setAssigningId(null);
    }
  };

  // Auto-assign: pick closest available delivery user
  const autoAssign = async (order) => {
    if (!deliveryUsers.length) {
      toast.error('No hay usuarios con rol "delivery". Invita uno primero desde Usuarios & Roles.');
      return;
    }
    // Sort by distance (or by least active if no GPS)
    const sorted = [...deliveryUsers].sort((a, b) => {
      const dA = getDriverForUser(a.email);
      const dB = getDriverForUser(b.email);
      const distA = calculateDistance(dA?.current_lat, dA?.current_lng, order.delivery_lat, order.delivery_lng);
      const distB = calculateDistance(dB?.current_lat, dB?.current_lng, order.delivery_lat, order.delivery_lng);
      return distA - distB;
    });
    await assignOrder(order, sorted[0]);
  };

  if (loading) return <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;

  // Filter unassigned (no assigned_driver_email AND in assignable status)
  const unassigned = orders.filter(o =>
    !o.assigned_driver_email && ['pending', 'confirmed', 'preparing'].includes(o.status)
  );
  const assigned = orders.filter(o =>
    o.assigned_driver_email && ['confirmed', 'preparing', 'on_the_way'].includes(o.status)
  );

  return (
    <Tabs defaultValue="unassigned" className="w-full">
      <TabsList className="w-full mb-4 bg-muted flex-wrap h-auto">
        <TabsTrigger value="unassigned" className="flex-1">Sin asignar ({unassigned.length})</TabsTrigger>
        <TabsTrigger value="assigned" className="flex-1">Asignados ({assigned.length})</TabsTrigger>
        <TabsTrigger value="drivers" className="flex-1">Repartidores ({deliveryUsers.length})</TabsTrigger>
      </TabsList>

      {/* Unassigned */}
      <TabsContent value="unassigned" className="space-y-3">
        {deliveryUsers.length === 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">No hay repartidores</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ve a SuperAdmin → Usuarios & Roles e invita usuarios con rol <strong>Repartidor</strong> (delivery).
              </p>
            </div>
          </div>
        )}

        {unassigned.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Todos los pedidos están asignados</p>
        ) : (
          unassigned.map(order => (
            <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-start justify-between mb-3 gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-strawberry">#{order.tracking_code}</span>
                    <Badge className="text-xs">{order.status}</Badge>
                  </div>
                  <p className="font-semibold text-sm">{order.customer_name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" /> {order.customer_address}
                  </p>
                  <p className="text-xs font-medium text-strawberry mt-1">${order.total?.toFixed(2)}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    size="sm"
                    onClick={() => autoAssign(order)}
                    disabled={assigningId === order.id || deliveryUsers.length === 0}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {assigningId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}
                    Auto
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                    className="text-xs"
                  >
                    Manual
                  </Button>
                </div>
              </div>

              {selectedOrder?.id === order.id && (
                <div className="bg-muted p-3 rounded-lg space-y-2">
                  <p className="text-xs font-semibold mb-2">Selecciona un repartidor:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                    {deliveryUsers.map(u => {
                      const profile = getDriverForUser(u.email);
                      return (
                        <button
                          key={u.id}
                          onClick={() => assignOrder(order, u)}
                          disabled={assigningId === order.id}
                          className="p-2 bg-card border border-border rounded-lg hover:border-strawberry transition text-left text-xs disabled:opacity-50"
                        >
                          <div className="flex items-center gap-2">
                            {profile?.photo_url ? (
                              <img src={profile.photo_url} className="w-7 h-7 rounded-full object-cover" alt="" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-strawberry/10 flex items-center justify-center">
                                <UserCheck className="w-3.5 h-3.5 text-strawberry" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{u.full_name || u.email}</p>
                              <p className="text-muted-foreground truncate">
                                {profile ? `⭐ ${profile.average_rating?.toFixed(1) || '5.0'} · ${profile.total_deliveries || 0} entregas` : 'Nuevo repartidor'}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          ))
        )}
      </TabsContent>

      {/* Assigned */}
      <TabsContent value="assigned" className="space-y-3">
        {assigned.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Sin pedidos en ruta</p>
        ) : assigned.map(order => (
          <div key={order.id} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {order.assigned_driver_photo ? (
                  <img src={order.assigned_driver_photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-strawberry/10 flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-strawberry" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{order.assigned_driver_name}</p>
                  <p className="text-xs text-muted-foreground truncate">#{order.tracking_code} → {order.customer_name}</p>
                </div>
              </div>
              <Badge className={
                order.status === 'on_the_way'
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              }>
                {order.status === 'on_the_way' ? 'En ruta' : order.status}
              </Badge>
            </div>
          </div>
        ))}
      </TabsContent>

      {/* Drivers */}
      <TabsContent value="drivers" className="space-y-3">
        {deliveryUsers.map(u => {
          const profile = getDriverForUser(u.email);
          return (
            <div key={u.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
              {profile?.photo_url ? (
                <img src={profile.photo_url} alt={u.full_name} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-strawberry/10 flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-strawberry" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{u.full_name || u.email}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                {profile ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    ⭐ {profile.average_rating?.toFixed(1) || '5.0'} ({profile.rating_count || 0}) · {profile.total_deliveries || 0} entregas
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Sin perfil de conductor — se creará al asignar</p>
                )}
              </div>
              <Badge className={profile?.is_available ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}>
                {profile?.is_available ? 'Disponible' : 'Sin GPS'}
              </Badge>
            </div>
          );
        })}
      </TabsContent>
    </Tabs>
  );
}