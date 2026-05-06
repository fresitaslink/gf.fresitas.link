import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Users, TrendingUp, Award, Truck, Plus, Edit, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import DriverAssignmentPanel from '@/components/admin/DriverAssignmentPanel';
import AutoDispatchPanel from '@/components/admin/AutoDispatchPanel';
import LiveTrackingDashboard from '@/components/admin/LiveTrackingDashboard';
import DriverSetupGuide from '@/components/admin/DriverSetupGuide';

export default function DriverManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    user_email: '',
    photo_url: '',
    vehicle_type: 'car',
    vehicle_plate: '',
    vehicle_model: '',
    vehicle_color: '',
  });
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    if (!user || !['admin', 'owner', 'manager'].includes(user.role)) {
      navigate('/');
      return;
    }

    Promise.all([
      base44.entities.Driver.list('-average_rating'),
      base44.entities.Order.list('-created_date', 50),
    ]).then(([drv, ord]) => {
      setDrivers(drv);
      setOrders(ord);
      setLoading(false);
    });

    const unsubDriver = base44.entities.Driver.subscribe((event) => {
      if (event.type === 'create') setDrivers(prev => [event.data, ...prev]);
      if (event.type === 'update') setDrivers(prev => prev.map(d => d.id === event.id ? event.data : d));
      if (event.type === 'delete') setDrivers(prev => prev.filter(d => d.id !== event.id));
    });

    return () => unsubDriver();
  }, [user]);

  const handleSaveDriver = async () => {
   if (!formData.full_name?.trim()) {
     toast.error('El nombre es requerido');
     return;
   }

   try {
     if (editingDriver) {
       // Update driver record
       await base44.entities.Driver.update(editingDriver.id, {
         full_name: formData.full_name,
         phone: formData.phone,
         photo_url: formData.photo_url,
         vehicle_type: formData.vehicle_type,
         vehicle_plate: formData.vehicle_plate,
         vehicle_model: formData.vehicle_model,
         vehicle_color: formData.vehicle_color,
       });

       // Update corresponding User account
       const users = await base44.entities.User.filter({ email: editingDriver.user_email });
       if (users[0]) {
         await base44.auth.updateMe({
           role: 'delivery', // Ensure role is set
         });
       }
       toast.success('Conductor actualizado');
     } else {
       if (!formData.user_email?.trim()) {
         toast.error('El email es requerido');
         return;
       }

       // Verify the user exists in User table
       const existingUsers = await base44.entities.User.filter({ email: formData.user_email });
       if (!existingUsers[0]) {
         toast.error('El usuario no existe. Primero invita el usuario como "delivery" en configuración');
         return;
       }

       // Create driver record linked to real user
       await base44.entities.Driver.create({
         user_email: formData.user_email,
         full_name: formData.full_name,
         phone: formData.phone,
         photo_url: formData.photo_url,
         vehicle_type: formData.vehicle_type,
         vehicle_plate: formData.vehicle_plate,
         vehicle_model: formData.vehicle_model,
         vehicle_color: formData.vehicle_color,
         is_active: true,
         is_available: false,
       });
       toast.success(`Conductor ${formData.full_name} agregado con email: ${formData.user_email}`);
     }
     setShowForm(false);
     setEditingDriver(null);
     setPhotoPreview(null);
     setFormData({ full_name: '', phone: '', user_email: '', photo_url: '', vehicle_type: 'car', vehicle_plate: '', vehicle_model: '', vehicle_color: '' });
   } catch (err) {
     toast.error('Error: ' + err.message);
   }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este conductor?')) {
      try {
        await base44.entities.Driver.delete(id);
        toast.success('Conductor eliminado');
      } catch (err) {
        toast.error('No se pudo eliminar');
      }
    }
  };

  if (loading) return <div className="min-h-screen pt-20 flex items-center justify-center">Cargando...</div>;

  const activeDrivers = drivers.filter(d => d.is_active);
  const onlineDrivers = drivers.filter(d => d.is_available);
  const avgRating = activeDrivers.length ? (activeDrivers.reduce((sum, d) => sum + (d.average_rating || 0), 0) / activeDrivers.length).toFixed(1) : 0;

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-poppins font-bold text-3xl">Gestión de Conductores</h1>
              <p className="text-muted-foreground text-sm">Fleet management en tiempo real</p>
            </div>
            <Button onClick={() => setShowForm(!showForm)} className="bg-strawberry text-white hover:bg-strawberry/90">
              <Plus className="w-4 h-4 mr-2" /> Agregar Conductor
            </Button>
          </div>

          {/* Setup Guide */}
          <DriverSetupGuide />

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Conductores Activos</p>
                  <p className="font-bold text-lg">{activeDrivers.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <Truck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">En Línea</p>
                  <p className="font-bold text-lg">{onlineDrivers.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Calificación Promedio</p>
                  <p className="font-bold text-lg">⭐ {avgRating}</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Entregas Hoy</p>
                  <p className="font-bold text-lg">12</p>
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="dispatch" className="w-full">
            <TabsList className="w-full mb-4 bg-muted flex-wrap h-auto">
              <TabsTrigger value="dispatch">Despacho Automático</TabsTrigger>
              <TabsTrigger value="tracking">Rastreo en Vivo</TabsTrigger>
              <TabsTrigger value="assignment">Asignación Manual</TabsTrigger>
              <TabsTrigger value="drivers">Conductores</TabsTrigger>
            </TabsList>

            {/* Auto Dispatch */}
            <TabsContent value="dispatch">
              <AutoDispatchPanel orders={orders} drivers={drivers} />
            </TabsContent>

            {/* Live Tracking */}
            <TabsContent value="tracking">
              <LiveTrackingDashboard orders={orders} />
            </TabsContent>

            {/* Assignment Panel */}
            <TabsContent value="assignment">
              <DriverAssignmentPanel orders={orders} />
            </TabsContent>

            {/* Drivers List */}
            <TabsContent value="drivers" className="space-y-3">
              {showForm && (
                  <div className="bg-card rounded-2xl border border-border p-6 space-y-4 mb-6">
                     <h3 className="font-semibold">{editingDriver ? 'Editar Conductor' : 'Nuevo Conductor'}</h3>
                     <div className="space-y-3">
                       <div>
                         <Label>Email</Label>
                         <Input type="email" value={formData.user_email} onChange={e => setFormData(p => ({ ...p, user_email: e.target.value }))} placeholder="conductor@example.com" className="rounded-lg" disabled={!!editingDriver} />
                       </div>
                       <div>
                         <Label>Nombre Completo</Label>
                         <Input value={formData.full_name} onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))} className="rounded-lg" />
                       </div>
                       <div>
                         <Label>Teléfono</Label>
                         <Input value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} className="rounded-lg" />
                       </div>
                       <div>
                         <Label>Foto de Perfil (URL)</Label>
                         <Input value={formData.photo_url} onChange={e => { setFormData(p => ({ ...p, photo_url: e.target.value })); setPhotoPreview(e.target.value); }} placeholder="https://example.com/photo.jpg" className="rounded-lg" />
                         {photoPreview && <img src={photoPreview} alt="preview" className="w-20 h-20 rounded-lg mt-2 object-cover" />}
                       </div>
                       <div>
                         <Label>Vehículo</Label>
                         <Input value={formData.vehicle_model} onChange={e => setFormData(p => ({ ...p, vehicle_model: e.target.value }))} placeholder="Toyota Corolla" className="rounded-lg" />
                       </div>
                       <div className="flex gap-2">
                         <Input value={formData.vehicle_color} onChange={e => setFormData(p => ({ ...p, vehicle_color: e.target.value }))} placeholder="Color" className="rounded-lg flex-1" />
                         <Input value={formData.vehicle_plate} onChange={e => setFormData(p => ({ ...p, vehicle_plate: e.target.value }))} placeholder="Placa" className="rounded-lg flex-1" />
                       </div>
                     </div>
                     <div className="flex gap-2">
                       <Button onClick={handleSaveDriver} className="flex-1 bg-strawberry text-white">Guardar</Button>
                       <Button onClick={() => { setShowForm(false); setPhotoPreview(null); }} variant="outline" className="flex-1">Cancelar</Button>
                     </div>
                   </div>
                 )}

              {activeDrivers.map(driver => (
                <motion.div key={driver.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-start gap-4">
                    <img src={driver.photo_url} alt={driver.full_name} className="w-14 h-14 rounded-full object-cover" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">{driver.full_name}</p>
                        <Badge className={driver.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                          {driver.is_available ? 'Disponible' : 'Ocupado'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{driver.vehicle_model} • {driver.vehicle_plate}</p>
                      <div className="flex gap-3 text-xs mt-2 text-muted-foreground">
                        <span>⭐ {driver.average_rating?.toFixed(1)} ({driver.rating_count})</span>
                        <span>📦 {driver.total_deliveries} entregas</span>
                        <span>📞 {driver.phone}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => {
                        setEditingDriver(driver);
                        setFormData({ full_name: driver.full_name, phone: driver.phone, user_email: driver.user_email, photo_url: driver.photo_url || '', vehicle_type: driver.vehicle_type, vehicle_plate: driver.vehicle_plate, vehicle_model: driver.vehicle_model, vehicle_color: driver.vehicle_color });
                        setPhotoPreview(driver.photo_url);
                        setShowForm(true);
                      }}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(driver.id)}>
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </TabsContent>


          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}