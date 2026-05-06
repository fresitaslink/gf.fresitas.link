import React from 'react';
import { AlertCircle, CheckCircle2, Users, Mail, Truck } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Guide for properly setting up drivers
 * Shows managers/owners how to link real users to drivers
 */
export default function DriverSetupGuide() {
  const steps = [
    {
      num: 1,
      icon: Users,
      title: 'Invita un usuario',
      description: 'En Dashboard → Users → Invite User',
      details: [
        'Email: Ingresa el email real del repartidor',
        'Role: Selecciona "delivery"',
        'El usuario recibirá un invite email'
      ],
      color: 'blue'
    },
    {
      num: 2,
      icon: Mail,
      title: 'Usuario se registra',
      description: 'El repartidor acepta el invite y crea su cuenta',
      details: [
        'Recibe email con link de verificación',
        'Crea su contraseña',
        'Queda registrado con role "delivery"'
      ],
      color: 'purple'
    },
    {
      num: 3,
      icon: Truck,
      title: 'Vincula a Driver',
      description: 'En esta página: Agregar Conductor',
      details: [
        'Email: MISMO email del usuario (ej: celso@example.com)',
        'NO generes un email falso',
        'Completa datos del vehículo y teléfono'
      ],
      color: 'green'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-2xl border border-blue-200 dark:border-blue-800 p-6 mb-6"
    >
      <div className="flex items-start gap-3 mb-6">
        <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
        <div>
          <h2 className="font-bold text-lg text-blue-900 dark:text-blue-300">¿Cómo vincular repartidores?</h2>
          <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
            Los repartidores necesitan una cuenta real (email/teléfono) para poder iniciar sesión y trabajar.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const colorClasses = {
            blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
            purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700',
            green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
          };

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`${colorClasses[step.color]} border-2 rounded-xl p-4`}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/50 dark:bg-black/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/60 dark:bg-black/20 font-bold text-xs">
                      {step.num}
                    </span>
                    <p className="font-bold text-sm">{step.title}</p>
                  </div>
                  <p className="text-xs mt-1 opacity-80">{step.description}</p>
                  <ul className="mt-2 space-y-1">
                    {step.details.map((detail, j) => (
                      <li key={j} className="text-xs flex items-start gap-2">
                        <CheckCircle2 className="w-3 h-3 flex-shrink-0 mt-0.5 opacity-60" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Important note */}
      <div className="mt-6 pt-6 border-t border-blue-200 dark:border-blue-800">
        <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4">
          <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-2">⚠️ IMPORTANTE:</p>
          <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1">
            <li>✗ NO crees emails falsos como "driver_1778@fresitas.local"</li>
            <li>✓ USA el email real del repartidor (celso@gmail.com, juan@mail.mx, etc.)</li>
            <li>✓ El email del conductor DEBE COINCIDIR con el del usuario invitado</li>
            <li>✓ Así el repartidor puede loginearse con su email/contraseña</li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
}