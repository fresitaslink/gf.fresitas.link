import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MapPin, Zap, Users, Loader2, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * Real-time demand heatmap dashboard
 * Shows order density and driver distribution
 */
export default function AdminHeatmap() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heatmapData, setHeatmapData] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    loadData();
    const interval = setInterval(loadData, 5000); // Update every 5s
    return () => clearInterval(interval);
  }, [user]);

  const loadData = async () => {
    try {
      const [ordersData, driversData] = await Promise.all([
        base44.entities.Order.filter({ status: 'pending' }, '-created_date', 500),
        base44.entities.Driver.filter({ is_available: true })
      ]);

      setOrders(ordersData);
      setDrivers(driversData);
      
      // Calculate heatmap
      const heatmap = calculateHeatmap(ordersData);
      setHeatmapData(heatmap);
      setLoading(false);
    } catch (err) {
      console.error('Error loading heatmap data:', err);
      setLoading(false);
    }
  };

  const calculateHeatmap = (ordersData) => {
    const gridSize = 0.05; // ~5km grid cells
    const heatmap = {};

    ordersData.forEach(order => {
      if (order.delivery_lat && order.delivery_lng) {
        const key = `${Math.floor(order.delivery_lat / gridSize)}_${Math.floor(order.delivery_lng / gridSize)}`;
        heatmap[key] = (heatmap[key] || 0) + 1;
      }
    });

    // Convert to array and sort by density
    return Object.entries(heatmap)
      .map(([key, count]) => {
        const [latIndex, lngIndex] = key.split('_').map(Number);
        return {
          key,
          lat: latIndex * gridSize,
          lng: lngIndex * gridSize,
          density: count,
          intensity: Math.min(count / 5, 1) // Normalize to 0-1
        };
      })
      .sort((a, b) => b.density - a.density);
  };

  const topZones = heatmapData.slice(0, 10);
  const totalOrders = orders.length;
  const avgDensity = heatmapData.length > 0 
    ? Math.round(heatmapData.reduce((sum, z) => sum + z.density, 0) / heatmapData.length)
    : 0;

  const handleOptimizeZone = async (zone) => {
    try {
      // Get unassigned drivers
      const availableDrivers = drivers.filter(d => !d.current_order_id);
      
      // Get zone orders
      const zoneOrders = orders.filter(o => {
        const oLatIndex = Math.floor(o.delivery_lat / 0.05);
        const oLngIndex = Math.floor(o.delivery_lng / 0.05);
        const zKey = `${oLatIndex}_${oLngIndex}`;
        return zKey === zone.key;
      });

      if (availableDrivers.length === 0) {
        toast.error('No hay repartidores disponibles');
        return;
      }

      toast.success(`Asignando ${Math.min(3, zoneOrders.length)} pedidos a ${availableDrivers.length} repartidores`);
      setSelectedZone(zone);
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-strawberry" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-poppins font-black text-3xl mb-2">🗺️ Mapa de Demanda en Tiempo Real</h1>
            <p className="text-muted-foreground">Identifica zonas de alta demanda y redistribuye repartidores</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-card rounded-2xl border border-border p-4">
              <p className="text-xs text-muted-foreground mb-1">Pedidos Pendientes</p>
              <p className="font-black text-3xl text-strawberry">{totalOrders}</p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-4">
              <p className="text-xs text-muted-foreground mb-1">Repartidores Disponibles</p>
              <p className="font-black text-3xl text-blue-600">{drivers.length}</p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-4">
              <p className="text-xs text-muted-foreground mb-1">Densidad Promedio</p>
              <p className="font-black text-3xl text-purple-600">{avgDensity}</p>
            </div>
          </div>

          {/* Heatmap visualization */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Top zones */}
            <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-strawberry" /> Zonas de Mayor Demanda
              </h2>
              <div className="space-y-3">
                {topZones.map((zone, i) => (
                  <motion.div
                    key={zone.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      selectedZone?.key === zone.key
                        ? 'border-strawberry bg-strawberry/5'
                        : 'border-border hover:border-strawberry/50'
                    }`}
                    onClick={() => setSelectedZone(zone)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Heat intensity bar */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-bold text-sm">Zona #{i + 1}</p>
                          <Badge className={`text-xs ${
                            zone.density >= 8 ? 'bg-red-100 text-red-700' :
                            zone.density >= 5 ? 'bg-orange-100 text-orange-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {zone.density} pedidos
                          </Badge>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 transition-all"
                            style={{ width: `${zone.intensity * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> 
                          Lat: {zone.lat.toFixed(2)}, Lng: {zone.lng.toFixed(2)}
                        </p>
                      </div>

                      {/* Action button */}
                      <button
                        onClick={() => handleOptimizeZone(zone)}
                        className="px-3 py-2 bg-strawberry text-white rounded-lg text-xs font-bold hover:bg-strawberry/90 transition-colors flex-shrink-0"
                      >
                        <Zap className="w-3 h-3 inline mr-1" /> Optimizar
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Driver allocation */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" /> Repartidores Disponibles
              </h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {drivers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No hay repartidores disponibles</p>
                ) : (
                  drivers.map((driver) => (
                    <div key={driver.id} className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-semibold">{driver.full_name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {driver.current_lat?.toFixed(2)}, {driver.current_lng?.toFixed(2)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="text-xs bg-green-100 text-green-700">
                          ⭐ {driver.average_rating?.toFixed(1) || 5.0}
                        </Badge>
                        <Badge className="text-xs bg-blue-100 text-blue-700">
                          📦 {driver.total_deliveries || 0}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Zone details if selected */}
          {selectedZone && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-strawberry/10 to-orange-100/20 rounded-2xl border border-strawberry/30 p-6"
            >
              <h3 className="font-bold text-lg mb-4">
                📍 Detalles de Zona #{topZones.indexOf(selectedZone) + 1}
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Pedidos Pendientes</p>
                  <p className="font-black text-2xl text-strawberry">{selectedZone.density}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Intensidad</p>
                  <p className="font-black text-2xl text-orange-600">{Math.round(selectedZone.intensity * 100)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Coordenadas</p>
                  <p className="text-sm font-mono">{selectedZone.lat.toFixed(2)}</p>
                  <p className="text-sm font-mono">{selectedZone.lng.toFixed(2)}</p>
                </div>
                <div className="flex items-center justify-end">
                  <Button
                    onClick={() => handleOptimizeZone(selectedZone)}
                    className="bg-strawberry hover:bg-strawberry/90 text-white gap-2"
                  >
                    <Zap className="w-4 h-4" /> Asignar Repartidores
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}