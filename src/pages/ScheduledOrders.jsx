import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useCart } from '@/lib/CartContext';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Edit2, Trash2, Loader2, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const FREQUENCIES = [
  { id: 'weekly', label: 'Semanal', description: 'Cada semana en el mismo día' },
  { id: 'biweekly', label: 'Cada 2 semanas', description: 'Cada 14 días' },
  { id: 'monthly', label: 'Mensual', description: 'El mismo día cada mes' }
];

const DAYS = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
];

export default function ScheduledOrders() {
  const { user } = useAuth();
  const { cart, clearCart } = useCart();
  const navigate = useNavigate();
  const [scheduled, setScheduled] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    frequency: 'weekly',
    day_of_week: 0,
    day_of_month: 1,
    preferred_time: '10:00'
  });

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    loadScheduled();
  }, [user]);

  const loadScheduled = async () => {
    try {
      const data = await base44.entities.ScheduledOrder.filter(
        { user_email: user.email, status: 'active' }
      );
      setScheduled(data);
      setLoading(false);
    } catch (err) {
      console.error('Error loading scheduled orders:', err);
      setLoading(false);
    }
  };

  const handleCreateScheduled = async () => {
    if (!cart || cart.length === 0) {
      toast.error('Agrega productos al carrito primero');
      navigate('/menu');
      return;
    }

    const profile = await base44.entities.CustomerProfile.filter(
      { user_email: user.email }
    );
    if (!profile[0]) {
      toast.error('Completa tu perfil primero');
      navigate('/perfil');
      return;
    }

    try {
      // Calculate totals
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const delivery_fee = subtotal >= 200 ? 0 : 30;
      const total = subtotal + delivery_fee;

      const newScheduled = await base44.entities.ScheduledOrder.create({
        user_email: user.email,
        customer_name: profile[0].display_name,
        customer_phone: profile[0].phone,
        customer_address: profile[0].addresses?.[0]?.address || '',
        delivery_lat: 19.4326,
        delivery_lng: -99.1332,
        items: cart,
        frequency: formData.frequency,
        day_of_week: formData.frequency === 'monthly' ? null : formData.day_of_week,
        day_of_month: formData.frequency === 'monthly' ? formData.day_of_month : null,
        preferred_time: formData.preferred_time,
        subtotal,
        delivery_fee,
        discount: 0,
        total,
        payment_method: 'tarjeta',
        status: 'active',
        is_active: true,
        next_order_date: calculateNextDate(formData),
        created_on: new Date().toISOString()
      });

      setScheduled([...scheduled, newScheduled]);
      clearCart();
      setShowForm(false);
      setFormData({ frequency: 'weekly', day_of_week: 0, day_of_month: 1, preferred_time: '10:00' });
      toast.success('¡Pedido programado creado! 🎉');
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este pedido programado?')) return;

    try {
      await base44.entities.ScheduledOrder.update(id, {
        status: 'cancelled',
        cancellation_reason: 'Cancelado por cliente'
      });

      setScheduled(scheduled.filter(s => s.id !== id));
      toast.success('Pedido cancelado');
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
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-poppins font-black text-3xl flex items-center gap-2">
                <Calendar className="w-8 h-8 text-strawberry" /> Pedidos Programados
              </h1>
              <p className="text-muted-foreground mt-1">Configura entregas recurrentes automáticas</p>
            </div>
            <Button
              onClick={() => setShowForm(!showForm)}
              className="bg-strawberry hover:bg-strawberry/90 text-white rounded-xl gap-2"
            >
              <Plus className="w-4 h-4" /> Nuevo
            </Button>
          </div>

          {/* Create Form */}
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl border border-border p-6 mb-8"
            >
              <h2 className="font-bold text-lg mb-4">Crear Nuevo Pedido Programado</h2>

              {!cart || cart.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">Necesitas agregar productos primero</p>
                  <Button
                    onClick={() => navigate('/menu')}
                    className="bg-strawberry hover:bg-strawberry/90 text-white"
                  >
                    Ir al Menú
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Frequency Selection */}
                  <div>
                    <label className="font-semibold text-sm mb-3 block">Frecuencia</label>
                    <div className="grid grid-cols-3 gap-3">
                      {FREQUENCIES.map(freq => (
                        <button
                          key={freq.id}
                          onClick={() => setFormData({ ...formData, frequency: freq.id })}
                          className={`p-3 rounded-lg border-2 transition-all text-center ${
                            formData.frequency === freq.id
                              ? 'border-strawberry bg-strawberry/10'
                              : 'border-border hover:border-strawberry/50'
                          }`}
                        >
                          <p className="font-bold text-sm">{freq.label}</p>
                          <p className="text-xs text-muted-foreground">{freq.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Day Selection */}
                  <div>
                    <label className="font-semibold text-sm mb-3 block">
                      {formData.frequency === 'monthly' ? 'Día del Mes' : 'Día de la Semana'}
                    </label>
                    {formData.frequency === 'monthly' ? (
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.day_of_month}
                        onChange={e => setFormData({ ...formData, day_of_month: parseInt(e.target.value) })}
                        className="rounded-lg"
                      />
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {DAYS.map((day, i) => (
                          <button
                            key={i}
                            onClick={() => setFormData({ ...formData, day_of_week: i })}
                            className={`p-2 rounded-lg border-2 text-xs font-bold transition-all ${
                              formData.day_of_week === i
                                ? 'border-strawberry bg-strawberry text-white'
                                : 'border-border hover:border-strawberry'
                            }`}
                          >
                            {day.slice(0, 3)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Time */}
                  <div>
                    <label className="font-semibold text-sm mb-3 block flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Hora Preferida
                    </label>
                    <Input
                      type="time"
                      value={formData.preferred_time}
                      onChange={e => setFormData({ ...formData, preferred_time: e.target.value })}
                      className="rounded-lg"
                    />
                  </div>

                  {/* Cart Summary */}
                  <div className="bg-muted rounded-lg p-4">
                    <p className="font-bold text-sm mb-2">Productos ({cart.length})</p>
                    <div className="space-y-1">
                      {cart.map((item, i) => (
                        <p key={i} className="text-xs text-muted-foreground">
                          {item.quantity}x {item.name}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button
                      onClick={handleCreateScheduled}
                      className="flex-1 bg-strawberry hover:bg-strawberry/90 text-white rounded-xl"
                    >
                      Guardar Pedido Programado
                    </Button>
                    <Button
                      onClick={() => setShowForm(false)}
                      variant="outline"
                      className="flex-1 rounded-xl"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Scheduled Orders List */}
          {scheduled.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-12 text-center">
              <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No tienes pedidos programados</p>
              <Button
                onClick={() => {
                  navigate('/menu');
                }}
                className="mt-4 bg-strawberry hover:bg-strawberry/90 text-white"
              >
                Crear Uno Ahora
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {scheduled.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card rounded-2xl border border-border p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-lg">
                          {FREQUENCIES.find(f => f.id === item.frequency)?.label}
                        </h3>
                        <Badge className="bg-green-100 text-green-700">Activo</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.frequency === 'monthly'
                          ? `Día ${item.day_of_month} de cada mes`
                          : `Cada ${DAYS[item.day_of_week]} a las ${item.preferred_time}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-2xl text-strawberry">${item.total}</p>
                      <p className="text-xs text-muted-foreground">{item.items.length} productos</p>
                    </div>
                  </div>

                  {/* Items preview */}
                  <div className="bg-muted rounded-lg p-3 mb-4">
                    <div className="space-y-1">
                      {item.items.map((prod, j) => (
                        <p key={j} className="text-xs text-muted-foreground">
                          {prod.quantity}x {prod.name}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                    <div className="bg-blue-50 rounded-lg p-2">
                      <p className="text-xs text-muted-foreground">Próxima</p>
                      <p className="font-bold text-sm">
                        {new Date(item.next_order_date).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-2">
                      <p className="text-xs text-muted-foreground">Total Creadas</p>
                      <p className="font-bold text-sm">{item.total_orders_created || 0}</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-2">
                      <p className="text-xs text-muted-foreground">Dirección</p>
                      <p className="font-bold text-xs">{item.customer_address.slice(0, 15)}...</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setFormData({
                          frequency: item.frequency,
                          day_of_week: item.day_of_week || 0,
                          day_of_month: item.day_of_month || 1,
                          preferred_time: item.preferred_time
                        });
                        setEditingId(item.id);
                      }}
                      variant="outline"
                      className="flex-1 gap-2"
                    >
                      <Edit2 className="w-4 h-4" /> Editar
                    </Button>
                    <Button
                      onClick={() => handleDelete(item.id)}
                      variant="outline"
                      className="flex-1 gap-2 text-destructive"
                    >
                      <Trash2 className="w-4 h-4" /> Cancelar
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function calculateNextDate(formData) {
  const today = new Date();
  const next = new Date(today);

  if (formData.frequency === 'monthly') {
    next.setMonth(next.getMonth() + 1);
    next.setDate(formData.day_of_month);
  } else {
    const daysUntil = (formData.day_of_week - today.getDay() + 7) % 7 || 7;
    next.setDate(next.getDate() + daysUntil);
  }

  return next.toISOString();
}