import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Flame, MapPin, Clock, TrendingUp, AlertCircle, Loader2, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function HeatmapDashboard() {
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [heatmapZones, setHeatmapZones] = useState([]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadData = async () => {
    try {
      const [ordersData, driversData] = await Promise.all([
        base44.entities.Order.list('-created_date', 500),
        base44.entities.Driver.list(),
      ]);

      // Filter by time range
      const cutoffTime = new Date();
      if (timeRange === '1h') cutoffTime.setHours(cutoffTime.getHours() - 1);
      else if (timeRange === '6h') cutoffTime.setHours(cutoffTime.getHours() - 6);
      else if (timeRange === '24h') cutoffTime.setDate(cutoffTime.getDate() - 1);

      const filteredOrders = ordersData.filter(o => new Date(o.created_date) > cutoffTime);
      setOrders(filteredOrders);
      setDrivers(driversData);

      // Calculate heatmap zones
      calculateHeatmap(filteredOrders, driversData);
      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setLoading(false);
    }
  };

  const calculateHeatmap = (ordersData, driversData) => {
    // Define grid (latitude/longitude buckets) - approximate for city
    const gridSize = 0.01; // ~1km grid
    const zones = {};

    ordersData.forEach(order => {
      if (!order.delivery_lat || !order.delivery_lng) return;

      const latBucket = Math.floor(order.delivery_lat / gridSize);
      const lngBucket = Math.floor(order.delivery_lng / gridSize);
      const key = `${latBucket},${lngBucket}`;

      zones[key] = zones[key] || {
        lat: (latBucket + 0.5) * gridSize,
        lng: (lngBucket + 0.5) * gridSize,
        pending_orders: 0,
        completed_orders: 0,
        failed_orders: 0,
        active_drivers: new Set(),
      };

      if (order.status === 'pending' || order.status === 'confirmed' || order.status === 'preparing') {
        zones[key].pending_orders++;
      } else if (order.status === 'delivered') {
        zones[key].completed_orders++;
      } else if (order.status === 'cancelled') {
        zones[key].failed_orders++;
      }

      // Add nearby drivers
      const nearbyDrivers = driversData.filter(d => {
        if (!d.current_lat || !d.current_lng) return false;
        const latDiff = Math.abs(d.current_lat - zones[key].lat);
        const lngDiff = Math.abs(d.current_lng - zones[key].lng);
        return latDiff < gridSize * 2 && lngDiff < gridSize * 2;
      });

      nearbyDrivers.forEach(d => zones[key].active_drivers.add(d.id));
    });

    // Convert to array and sort by pending orders (heat)
    const zoneArray = Object.values(zones)
      .map(zone => ({
        ...zone,
        active_drivers_count: zone.active_drivers.size,
        heat_score: zone.pending_orders + (zone.completed_orders * 0.3),
      }))
      .sort((a, b) => b.heat_score - a.heat_score);

    setHeatmapZones(zoneArray);
  };

  const getHeatColor = (heat_score) => {
    if (heat_score >= 15) return 'bg-red-500';
    if (heat_score >= 10) return 'bg-orange-500';
    if (heat_score >= 5) return 'bg-yellow-500';
    if (heat_score >= 2) return 'bg-lime-500';
    return 'bg-green-500';
  };

  const getHeatLabel = (heat_score) => {
    if (heat_score >= 15) return '🔴 Crítica';
    if (heat_score >= 10) return '🟠 Alta';
    if (heat_score >= 5) return '🟡 Media';
    if (heat_score >= 2) return '🟢 Baja';
    return '⚪ Muy Baja';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const topZones = heatmapZones.slice(0, 8);
  const criticalZones = heatmapZones.filter(z => z.heat_score >= 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-poppins font-bold text-xl flex items-center gap-2">
            <Flame className="w-6 h-6 text-orange-500" /> Mapa de Calor en Tiempo Real
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Zonas con mayor concentración de pedidos pendientes
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">Última Hora</SelectItem>
            <SelectItem value="6h">Últimas 6 Horas</SelectItem>
            <SelectItem value="24h">Últimas 24 Horas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Critical Zones Alert */}
      {criticalZones.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-lg"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-red-700 dark:text-red-400">
                🚨 {criticalZones.length} Zona{criticalZones.length > 1 ? 's' : ''} Crítica{criticalZones.length > 1 ? 's' : ''}
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                Recomendación: Desplegar conductores adicionales en zonas de alta demanda
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Heatmap Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {topZones.map((zone, i) => (
          <motion.div
            key={`${zone.lat},${zone.lng}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={`${getHeatColor(zone.heat_score)} text-white rounded-xl p-4 shadow-lg hover:shadow-xl transition-shadow cursor-pointer`}
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-black">{zone.pending_orders}</p>
                  <p className="text-xs opacity-90">Pendientes</p>
                </div>
                <Badge variant="secondary" className="text-white bg-white/20">
                  {getHeatLabel(zone.heat_score).split(' ')[1]}
                </Badge>
              </div>

              <div className="border-t border-white/30 pt-2 text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Completadas:</span>
                  <span className="font-semibold">{zone.completed_orders}</span>
                </div>
                <div className="flex justify-between">
                  <span>Conductores:</span>
                  <span className="font-semibold">{zone.active_drivers_count}</span>
                </div>
              </div>

              <p className="text-xs opacity-75 pt-1">
                📍 {zone.lat.toFixed(3)}, {zone.lng.toFixed(3)}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Zone Details Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-semibold">Zona</th>
                <th className="text-center p-3 font-semibold">Pendientes</th>
                <th className="text-center p-3 font-semibold">Completadas</th>
                <th className="text-center p-3 font-semibold">Fallidas</th>
                <th className="text-center p-3 font-semibold">Conductores</th>
                <th className="text-center p-3 font-semibold">Intensidad</th>
              </tr>
            </thead>
            <tbody>
              {heatmapZones.slice(0, 10).map((zone, i) => (
                <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getHeatColor(zone.heat_score)}`} />
                      <code className="text-muted-foreground">{zone.lat.toFixed(2)}, {zone.lng.toFixed(2)}</code>
                    </div>
                  </td>
                  <td className="text-center p-3 font-bold text-lg">{zone.pending_orders}</td>
                  <td className="text-center p-3">{zone.completed_orders}</td>
                  <td className="text-center p-3">{zone.failed_orders}</td>
                  <td className="text-center p-3">
                    <Badge variant="outline" className="mx-auto">{zone.active_drivers_count}</Badge>
                  </td>
                  <td className="text-center p-3">
                    <span className={`font-semibold ${
                      zone.heat_score >= 15 ? 'text-red-500' :
                      zone.heat_score >= 10 ? 'text-orange-500' :
                      zone.heat_score >= 5 ? 'text-yellow-500' : 'text-green-500'
                    }`}>
                      {zone.heat_score.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Zonas</p>
          <p className="font-black text-2xl">{heatmapZones.length}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Pedidos Pendientes</p>
          <p className="font-black text-2xl text-orange-600">
            {heatmapZones.reduce((sum, z) => sum + z.pending_orders, 0)}
          </p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Conductores Activos</p>
          <p className="font-black text-2xl text-green-600">
            {drivers.filter(d => d.is_available).length}
          </p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Ratio Demanda</p>
          <p className="font-black text-2xl">
            {(heatmapZones.reduce((sum, z) => sum + z.pending_orders, 0) / Math.max(drivers.filter(d => d.is_available).length, 1)).toFixed(1)}
          </p>
        </div>
      </div>
    </div>
  );
}