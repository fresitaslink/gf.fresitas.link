import React from 'react';
import { Bell, Mail, CheckCircle2, Clock, ChefHat, Truck, Home, Star, Gift, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const NOTIFICATION_TYPES = [
  { icon: CheckCircle2, color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20',   label: 'Pedido Confirmado',     desc: 'Al confirmar el pedido', active: true },
  { icon: ChefHat,     color: 'text-orange-500',  bg: 'bg-orange-50 dark:bg-orange-900/20',label: 'En Preparación',        desc: 'Cuando la cocina comienza', active: true },
  { icon: Truck,       color: 'text-purple-500',  bg: 'bg-purple-50 dark:bg-purple-900/20',label: 'En Camino',             desc: 'Cuando el repartidor recoge', active: true },
  { icon: Home,        color: 'text-green-500',   bg: 'bg-green-50 dark:bg-green-900/20',  label: 'Entregado',             desc: 'Al completar la entrega', active: true },
  { icon: Star,        color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-900/20',  label: 'Solicitud de Reseña',   desc: '24h después de la entrega', active: true },
  { icon: Gift,        color: 'text-pink-500',    bg: 'bg-pink-50 dark:bg-pink-900/20',    label: 'Puntos de Lealtad',     desc: 'Al ganar o canjear puntos', active: true },
  { icon: AlertTriangle,color: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-900/20',      label: 'Alerta de Stock Bajo',  desc: 'Para admins cuando el inventario está bajo', active: true },
];

export default function NotificationStatusCard() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-border bg-gradient-to-r from-strawberry/5 to-pink-500/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-strawberry/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-strawberry" />
          </div>
          <div>
            <h3 className="font-poppins font-bold text-base">Sistema de Notificaciones</h3>
            <p className="text-xs text-muted-foreground">Notificaciones automáticas en tiempo real</p>
          </div>
          <Badge className="ml-auto bg-green-100 text-green-700 text-xs">Activo</Badge>
        </div>
      </div>

      <div className="p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-muted rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Mail className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-semibold">Email</span>
            </div>
            <Badge className="bg-green-100 text-green-700 text-xs">Configurado</Badge>
          </div>
          <div className="bg-muted rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Bell className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-semibold">Push</span>
            </div>
            <Badge className="bg-green-100 text-green-700 text-xs">Configurado</Badge>
          </div>
        </div>

        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Disparadores configurados</p>
        <div className="space-y-2">
          {NOTIFICATION_TYPES.map((n, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 ${n.bg} rounded-xl`}>
              <n.icon className={`w-4 h-4 ${n.color} flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{n.label}</p>
                <p className="text-xs text-muted-foreground">{n.desc}</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}