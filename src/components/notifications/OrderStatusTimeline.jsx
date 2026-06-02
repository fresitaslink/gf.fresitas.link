import React from 'react';
import { CheckCircle2, Clock, ChefHat, Truck, Home, XCircle, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const STATUS_CONFIG = {
  pending:    { label: 'Pedido recibido',    icon: Clock,         color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20',    border: 'border-yellow-200 dark:border-yellow-800' },
  confirmed:  { label: 'Pedido confirmado',  icon: CheckCircle2,  color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20',         border: 'border-blue-200 dark:border-blue-800' },
  preparing:  { label: 'Preparando tu pedido', icon: ChefHat,     color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20',     border: 'border-orange-200 dark:border-orange-800' },
  ready:      { label: 'Listo para recoger', icon: Package,       color: 'text-teal-600',   bg: 'bg-teal-50 dark:bg-teal-900/20',         border: 'border-teal-200 dark:border-teal-800' },
  on_the_way: { label: 'En camino',          icon: Truck,         color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20',     border: 'border-purple-200 dark:border-purple-800' },
  delivered:  { label: 'Entregado',          icon: Home,          color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/20',       border: 'border-green-200 dark:border-green-800' },
  cancelled:  { label: 'Cancelado',          icon: XCircle,       color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20',           border: 'border-red-200 dark:border-red-800' },
};

const WORKFLOW = ['pending', 'confirmed', 'preparing', 'on_the_way', 'delivered'];

export default function OrderStatusTimeline({ order }) {
  if (!order) return null;
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const Icon = config.icon;
  const currentIdx = WORKFLOW.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className={`rounded-2xl border ${config.border} ${config.bg} p-4 space-y-4`}>
      {/* Current status hero */}
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl bg-white dark:bg-black/20 flex items-center justify-center flex-shrink-0 shadow-sm`}>
          <Icon className={`w-6 h-6 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-poppins font-bold text-base ${config.color}`}>{config.label}</p>
          {order.estimated_delivery && !isCancelled && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Entrega estimada: <strong>{order.estimated_delivery}</strong>
            </p>
          )}
          {order.assigned_driver_name && order.status === 'on_the_way' && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Repartidor: <strong>{order.assigned_driver_name}</strong>
              {order.assigned_driver_rating && <span className="ml-1 text-amber-500">★ {order.assigned_driver_rating.toFixed(1)}</span>}
            </p>
          )}
        </div>
        <Badge variant="outline" className={`text-xs flex-shrink-0 ${config.color}`}>
          #{order.tracking_code}
        </Badge>
      </div>

      {/* Timeline steps */}
      {!isCancelled && (
        <div className="flex items-center gap-1">
          {WORKFLOW.map((step, i) => {
            const cfg = STATUS_CONFIG[step];
            const StepIcon = cfg.icon;
            const done = i <= currentIdx;
            const active = i === currentIdx;
            return (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    done ? 'bg-strawberry shadow-sm' : 'bg-muted'
                  } ${active ? 'ring-2 ring-strawberry ring-offset-1' : ''}`}>
                    <StepIcon className={`w-3.5 h-3.5 ${done ? 'text-white' : 'text-muted-foreground'}`} />
                  </div>
                </div>
                {i < WORKFLOW.length - 1 && (
                  <div className={`flex-1 h-0.5 transition-all ${i < currentIdx ? 'bg-strawberry' : 'bg-border'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}