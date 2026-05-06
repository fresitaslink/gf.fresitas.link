import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Truck, MapPin, Clock, User, CheckCircle, AlertCircle, Zap, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DriverAssignmentPanel({ orders = [] }) {
  const [unassignedOrders, setUnassignedOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [assignmentMode, setAssignmentMode] = useState('auto');

  useEffect(() => {
    Promise.all([
      base44.entities.Driver.list('-average_rating'),
      base44.entities.DriverAssignment.list('-created_date'),
    ]).then(([drv, assign]) => {
      setDrivers(drv.filter(d => d.is_active)); // Show all active drivers, available or not
      setAssignments(assign);
      const assignedIds = assign.map(a => a.order_id);
      setUnassignedOrders(orders.filter(o => !assignedIds.includes(o.id) && ['pending', 'confirmed'].includes(o.status)));
      setLoading(false);
    });

    const unsubscribe = base44.entities.DriverAssignment.subscribe((event) => {
      setAssignments(prev => event.type === 'create' ? [event.data, ...prev] : prev.map(a => a.id === event.id ? event.data : a));
    });
    return () => unsubscribe();
  }, [orders]);

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const autoAssignOrder = async (order) => {
    const eligible = drivers.filter(d => {
      const dist = calculateDistance(d.current_lat || 0, d.current_lng || 0, order.delivery_lat || 0, order.delivery_lng || 0);
      return dist <= (d.max_distance_km || 50) && d.active_orders_count < 3;
    }).sort((a, b) => {
      const distA = calculateDistance(a.current_lat, a.current_lng, order.delivery_lat, order.delivery_lng);
      const distB = calculateDistance(b.current_lat, b.current_lng, order.delivery_lat, order.delivery_lng);
      return distA - distB;
    });

    if (!eligible.length) {
      toast.error('No drivers available for this order');
      return;
    }

    const driver = eligible[0];
    const distance = calculateDistance(driver.current_lat, driver.current_lng, order.delivery_lat, order.delivery_lng);
    const estimatedTime = Math.ceil(distance / 25 * 60);

    try {
      await base44.entities.DriverAssignment.create({
        order_id: order.id,
        driver_email: driver.user_email,
        driver_name: driver.full_name,
        driver_photo: driver.photo_url,
        driver_rating: driver.average_rating,
        assignment_status: 'pending',
        pickup_lat: order.delivery_lat,
        pickup_lng: order.delivery_lng,
        delivery_lat: order.delivery_lat,
        delivery_lng: order.delivery_lng,
        estimated_distance_km: distance,
        estimated_duration_minutes: estimatedTime,
        assignment_method: 'auto',
      });
      toast.success(`Assigned to ${driver.full_name}`);
      setUnassignedOrders(prev => prev.filter(o => o.id !== order.id));
    } catch (err) {
      toast.error('Assignment failed');
    }
  };

  const manualAssign = async (order, driver) => {
    if (!order || !driver) return;
    const distance = calculateDistance(driver.current_lat || 0, driver.current_lng || 0, order.delivery_lat || 0, order.delivery_lng || 0);
    const estimatedTime = Math.ceil(distance / 25 * 60);

    try {
      await base44.entities.DriverAssignment.create({
        order_id: order.id,
        driver_email: driver.user_email,
        driver_name: driver.full_name,
        driver_photo: driver.photo_url,
        driver_rating: driver.average_rating,
        assignment_status: 'pending',
        pickup_lat: order.delivery_lat,
        pickup_lng: order.delivery_lng,
        delivery_lat: order.delivery_lat,
        delivery_lng: order.delivery_lng,
        estimated_distance_km: distance,
        estimated_duration_minutes: estimatedTime,
        assignment_method: 'manual',
        assigned_by_email: await base44.auth.me().then(u => u?.email),
      });
      toast.success(`✅ Assigned to ${driver.full_name}`);
      setUnassignedOrders(prev => prev.filter(o => o.id !== order.id));
      setSelectedOrder(null);
    } catch (err) {
      toast.error('Failed to assign');
    }
  };

  if (loading) return <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;

  return (
    <Tabs defaultValue="unassigned" className="w-full">
      <TabsList className="w-full mb-4 bg-muted flex-wrap h-auto">
        <TabsTrigger value="unassigned" className="flex-1">Pendientes ({unassignedOrders.length})</TabsTrigger>
        <TabsTrigger value="active">En Ruta ({assignments.filter(a => a.assignment_status === 'active').length})</TabsTrigger>
        <TabsTrigger value="drivers">Conductores ({drivers.length})</TabsTrigger>
      </TabsList>

      {/* Unassigned Orders */}
      <TabsContent value="unassigned" className="space-y-3">
        {unassignedOrders.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Todos los pedidos están asignados</p>
        ) : (
          unassignedOrders.map(order => (
            <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="font-semibold text-sm">{order.customer_name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {order.customer_address}</p>
                  <p className="text-xs font-medium text-strawberry mt-1">${order.total?.toFixed(2)}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => autoAssignOrder(order)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
                    <Zap className="w-3 h-3 mr-1" /> Auto
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)} className="text-xs">
                    Manual
                  </Button>
                </div>
              </div>

              {selectedOrder?.id === order.id && (
                <div className="bg-muted p-3 rounded-lg space-y-2">
                  <p className="text-xs font-semibold mb-2">Selecciona un conductor:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {drivers.map(driver => (
                      <button key={driver.id} onClick={() => manualAssign(order, driver)} className="p-2 bg-card border border-border rounded-lg hover:border-strawberry transition text-left text-xs">
                        <p className="font-medium">{driver.full_name}</p>
                        <p className="text-muted-foreground">⭐ {driver.average_rating?.toFixed(1)} • {driver.active_orders_count || 0} activos</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))
        )}
      </TabsContent>

      {/* Active Assignments */}
      <TabsContent value="active" className="space-y-3">
        {assignments.filter(a => a.assignment_status === 'active').map(assign => (
          <div key={assign.id} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={assign.driver_photo} alt={assign.driver_name} className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <p className="font-semibold text-sm">{assign.driver_name}</p>
                  <p className="text-xs text-muted-foreground">⭐ {assign.driver_rating?.toFixed(1)}</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">En ruta</Badge>
            </div>
          </div>
        ))}
      </TabsContent>

      {/* Available Drivers */}
      <TabsContent value="drivers" className="space-y-3">
        {drivers.map(driver => (
          <div key={driver.id} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-start gap-3">
              <img src={driver.photo_url} alt={driver.full_name} className="w-12 h-12 rounded-full object-cover" />
              <div className="flex-1">
                <p className="font-semibold text-sm">{driver.full_name}</p>
                <div className="text-xs text-muted-foreground space-y-1 mt-1">
                  <p>⭐ {driver.average_rating?.toFixed(1)} ({driver.rating_count} calificaciones)</p>
                  <p>📦 {driver.total_deliveries} entregas • 🚗 {driver.vehicle_model}</p>
                  <p>🎯 Aceptación: {driver.acceptance_rate?.toFixed(0)}% • ⏱️ {driver.average_delivery_time || '-'} min prom.</p>
                </div>
              </div>
              <Badge className={driver.is_available ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-gray-100 text-gray-700'}>
                {driver.is_available ? 'Disponible' : 'Ocupado'}
              </Badge>
            </div>
          </div>
        ))}
      </TabsContent>
    </Tabs>
  );
}