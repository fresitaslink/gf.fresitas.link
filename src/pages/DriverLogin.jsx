import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function DriverLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Check if user exists and has 'delivery' role
      const user = await base44.auth.me();

      if (!user) {
        // User not authenticated - redirect to login
        await base44.auth.redirectToLogin('/driver');
        return;
      }

      if (user.role !== 'delivery') {
        setError('⚠️ Solo conductores pueden acceder. Tu rol es: ' + user.role);
        return;
      }

      // Check if driver profile exists
      const drivers = await base44.entities.Driver.filter({ user_email: user.email });

      if (!drivers || drivers.length === 0) {
        setError('❌ Perfil de conductor no encontrado. Contacta al administrador.');
        return;
      }

      toast.success(`✅ ¡Bienvenido, ${user.full_name}!`);
      navigate('/driver');
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border p-8 max-w-sm w-full shadow-xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🚗</div>
          <h1 className="text-2xl font-bold">Fresitas Drivers</h1>
          <p className="text-sm text-muted-foreground mt-1">Portal de Conductores</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              ℹ️ Usa tu email de conductor para iniciar sesión.
            </p>
          </div>

          {/* Login Button */}
          <Button
            onClick={async () => {
              setLoading(true);
              try {
                await base44.auth.redirectToLogin('/driver');
              } catch (err) {
                setError('Error al redirigir a login');
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 h-10"
          >
            {loading ? '⏳ Cargando...' : '🔐 Iniciar Sesión como Conductor'}
          </Button>

          {/* Back Link */}
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/')}
            className="w-full"
          >
            ← Volver al inicio
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          <p>¿Necesitas ayuda?</p>
          <p className="mt-1">
            Contacta al administrador si no puedes acceder
          </p>
        </div>
      </div>
    </div>
  );
}