import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Polyline, Marker, Popup, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Clock, Route, User as UserIcon } from 'lucide-react';

export default function DriverRouteHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [points, setPoints] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !['admin', 'owner', 'manager'].includes(user.role)) {
      navigate('/');
      return;
    }
    base44.entities.Driver.list().then(d => {
      setDrivers(d);
      if (d.length > 0 && !selectedDriver) setSelectedDriver(d[0].user_email);
    });
  }, [user]);

  useEffect(() => {
    if (!selectedDriver || !date) return;
    setLoading(true);

    const dayStart = new Date(date + 'T00:00:00').toISOString();
    const dayEnd = new Date(date + 'T23:59:59').toISOString();

    Promise.all([
      base44.entities.DriverLocationHistory.filter({ driver_email: selectedDriver }, 'recorded_at', 1000),
      base44.entities.Order.filter({ assigned_driver_email: selectedDriver }),
    ]).then(([history, ord]) => {
      const filtered = history.filter(p => {
        const t = p.recorded_at || p.created_date;
        return t >= dayStart && t <= dayEnd;
      });
      setPoints(filtered);

      const dayOrders = ord.filter(o => o.created_date >= dayStart && o.created_date <= dayEnd);
      setOrders(dayOrders);
      setLoading(false);
    });
  }, [selectedDriver, date]);

  // Calculate stats
  let totalKm = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i-1], b = points[i];
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const c = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180) * Math.cos(b.lat*Math.PI/180) * Math.sin(dLng/2)**2;
    totalKm += R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1-c));
  }
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;
  const polyline = points.map(p => [p.lat, p.lng]);
  const center = points.length ? [points[0].lat, points[0].lng] : [19.4326, -99.1332];
  const driver = drivers.find(d => d.user_email === selectedDriver);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-6">
            <h1 className="font-poppins font-bold text-3xl">Historial de Rutas</h1>
            <p className="text-muted-foreground text-sm">Audita las rutas de los conductores por día</p>
          </div>

          {/* Filters */}
          <Card className="p-4 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Conductor</Label>
              <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                <SelectTrigger><SelectValue placeholder="Selecciona conductor" /></SelectTrigger>
                <SelectContent>
                  {drivers.map(d => (
                    <SelectItem key={d.id} value={d.user_email}>{d.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Route className="w-8 h-8 text-strawberry" />
                <div>
                  <p className="text-xs text-muted-foreground">Distancia</p>
                  <p className="font-bold text-lg">{totalKm.toFixed(1)} km</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <MapPin className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Puntos</p>
                  <p className="font-bold text-lg">{points.length}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Entregas</p>
                  <p className="font-bold text-lg">{deliveredCount}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <UserIcon className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Conductor</p>
                  <p className="font-bold text-sm truncate">{driver?.full_name || '—'}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Map */}
          <Card className="p-2 mb-6">
            <div style={{ height: '500px', width: '100%' }} className="rounded-xl overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">Cargando...</div>
              ) : points.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Sin datos de ubicación para este día
                </div>
              ) : (
                <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Polyline positions={polyline} pathOptions={{ color: '#e91e63', weight: 4 }} />
                  {points.length > 0 && (
                    <Marker position={[points[0].lat, points[0].lng]}>
                      <Popup>Inicio: {new Date(points[0].recorded_at || points[0].created_date).toLocaleTimeString()}</Popup>
                    </Marker>
                  )}
                  {points.length > 1 && (
                    <Marker position={[points[points.length-1].lat, points[points.length-1].lng]}>
                      <Popup>Fin: {new Date(points[points.length-1].recorded_at || points[points.length-1].created_date).toLocaleTimeString()}</Popup>
                    </Marker>
                  )}
                  {orders.filter(o => o.delivery_lat && o.delivery_lng && o.status === 'delivered').map(o => (
                    <CircleMarker
                      key={o.id}
                      center={[o.delivery_lat, o.delivery_lng]}
                      radius={8}
                      pathOptions={{ color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.7 }}
                    >
                      <Popup>
                        <strong>#{o.tracking_code}</strong><br/>
                        {o.customer_name}<br/>
                        ${o.total?.toFixed(2)}
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              )}
            </div>
          </Card>

          {/* Orders list */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Pedidos del día ({orders.length})</h3>
            <div className="space-y-2">
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin pedidos</p>
              ) : orders.map(o => (
                <div key={o.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">#{o.tracking_code} — {o.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{o.customer_address}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-strawberry">${o.total?.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{o.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}