import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Truck, Shield, MapPin, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';

export default function DeliveryTrustSection() {
  const [stats, setStats] = useState({
    avgRating: 4.8,
    driverCount: 0,
    totalDeliveries: 0,
    onlineDrivers: 0,
  });
  const [topDrivers, setTopDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const drivers = await base44.entities.Driver.list('-average_rating', 100);
        const activeDrivers = drivers.filter(d => d.is_active);
        const avgRating = activeDrivers.length ? (activeDrivers.reduce((sum, d) => sum + (d.average_rating || 5), 0) / activeDrivers.length) : 4.8;
        const totalDeliveries = activeDrivers.reduce((sum, d) => sum + (d.total_deliveries || 0), 0);
        const onlineDrivers = activeDrivers.filter(d => d.is_available).length;

        setStats({
          avgRating: avgRating.toFixed(1),
          driverCount: activeDrivers.length,
          totalDeliveries,
          onlineDrivers,
        });

        setTopDrivers(activeDrivers.slice(0, 3));
      } catch (err) {
        console.error('Failed to load driver stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-strawberry/5 to-transparent">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mb-12">
          <h2 className="font-poppins font-bold text-3xl md:text-4xl text-foreground mb-3">
            Entregas Confiables en Tiempo Real
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Nuestros conductores verificados llevan tus fresitas directamente a tu puerta con transparencia total
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
        >
          {[
            {
              Icon: Star,
              label: 'Calificación Promedio',
              value: `⭐ ${stats.avgRating}`,
              color: 'from-gold to-orange-400',
            },
            {
              Icon: Truck,
              label: 'Conductores Activos',
              value: stats.driverCount,
              color: 'from-strawberry to-pink-400',
            },
            {
              Icon: MapPin,
              label: 'Entregas Completadas',
              value: stats.totalDeliveries.toLocaleString(),
              color: 'from-blue-400 to-cyan-400',
            },
            {
              Icon: Users,
              label: 'En Línea Ahora',
              value: stats.onlineDrivers,
              color: 'from-green-400 to-emerald-400',
            },
          ].map((stat, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              className={`bg-gradient-to-br ${stat.color} rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all`}
            >
              <stat.Icon className="w-6 h-6 mb-2 opacity-90" />
              <p className="text-xs opacity-80 mb-1">{stat.label}</p>
              <p className="font-bold text-2xl">{stat.value}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Top Drivers */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <h3 className="font-poppins font-bold text-xl mb-6 text-foreground">Top Conductores 🏆</h3>
          <div className="grid md:grid-cols-3 gap-5">
            {topDrivers.map((driver, i) => (
              <motion.div
                key={driver.id}
                whileHover={{ scale: 1.02, y: -5 }}
                className="bg-card rounded-2xl border border-border p-6 shadow-md hover:shadow-xl transition-all"
              >
                <div className="flex items-start gap-3 mb-3">
                  <img
                    src={driver.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${driver.full_name}`}
                    alt={driver.full_name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-strawberry"
                  />
                  <div className="flex-1">
                    <p className="font-bold text-sm">{driver.full_name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="w-4 h-4 text-gold fill-gold" />
                      <span className="font-bold text-sm">{driver.average_rating?.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">({driver.rating_count})</span>
                    </div>
                  </div>
                  {i === 0 && <Badge className="bg-gold text-white">⭐ #1</Badge>}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vehículo:</span>
                    <span className="font-medium">{driver.vehicle_model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entregas:</span>
                    <span className="font-medium">{driver.total_deliveries}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Aceptación:</span>
                    <span className="font-medium">{driver.acceptance_rate?.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tiempo Promedio:</span>
                    <span className="font-medium">{driver.average_delivery_time || '-'} min</span>
                  </div>
                </div>

                <Badge className={`w-full mt-3 justify-center text-xs ${driver.is_available ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-gray-100 text-gray-700'}`}>
                  {driver.is_available ? '🟢 Disponible' : '⚪ Ocupado'}
                </Badge>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 grid md:grid-cols-3 gap-4"
        >
          {[
            {
              Icon: Shield,
              title: 'Verificados',
              desc: 'Todos nuestros conductores pasan verificaciones de seguridad',
            },
            {
              Icon: MapPin,
              title: 'Rastreo en Tiempo Real',
              desc: 'Ve a tu conductor en el mapa durante toda la entrega',
            },
            {
              Icon: Star,
              title: 'Calificados por Usuarios',
              desc: 'Los conductores son evaluados después de cada entrega',
            },
          ].map((item, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-5 text-center">
              <item.Icon className="w-6 h-6 text-strawberry mx-auto mb-2" />
              <p className="font-semibold text-sm mb-1">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}