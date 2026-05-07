import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, TrendingUp, Clock, DollarSign, CreditCard, ExternalLink, AlertCircle, CheckCircle2, Loader2, Banknote } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

export default function DriverEarnings() {
  const [user, setUser] = useState(null);
  const [driver, setDriver] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [onboarding, setOnboarding] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const me = await base44.auth.me();
      setUser(me);

      const [drivers, earningsList, txns] = await Promise.all([
        base44.entities.Driver.filter({ user_email: me.email }, undefined, 1),
        base44.entities.DriverEarnings.filter({ driver_email: me.email }, '-created_date', 1),
        base44.entities.DriverTransaction.filter({ driver_email: me.email }, '-created_date', 50),
      ]);

      setDriver(drivers[0] || null);
      setEarnings(earningsList[0] || {
        driver_email: me.email,
        balance: 0, total_earned: 0, total_withdrawn: 0, pending_balance: 0,
        total_deliveries: 0, avg_earnings_per_delivery: 0,
      });
      setTransactions(txns);

      // Auto-refresh after Stripe onboarding return
      if (new URLSearchParams(window.location.search).get('onboarded') === '1') {
        toast.success('¡Cuenta de Stripe conectada! Ahora puedes recibir pagos reales.');
        window.history.replaceState({}, '', '/driver-earnings');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error cargando ganancias');
    } finally { setLoading(false); }
  };

  const startStripeOnboarding = async () => {
    setOnboarding(true);
    try {
      const result = await base44.functions.invoke('createDriverConnectAccount', {});
      if (result.data?.onboarding_url) {
        window.location.href = result.data.onboarding_url;
      } else {
        throw new Error(result.data?.error || 'No se pudo iniciar onboarding');
      }
    } catch (e) {
      toast.error('Error: ' + e.message);
      setOnboarding(false);
    }
  };

  const handleWithdraw = async (instant = false) => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) { toast.error('Cantidad inválida'); return; }

    setWithdrawing(true);
    try {
      const fnName = instant ? 'requestInstantPayout' : 'requestDriverPayout';
      const result = await base44.functions.invoke(fnName, { amount: amt });
      const data = result.data;

      if (data?.needs_onboarding) {
        toast.error('Primero completa el onboarding de Stripe');
        return;
      }
      if (!data?.success) throw new Error(data?.error || 'Falló el retiro');

      const arrival = data.arrival_estimate || (instant ? 'minutos' : '1-2 días hábiles');
      toast.success(`✅ Retiro de $${amt.toFixed(2)} · llega en ${arrival}`);
      setWithdrawAmount('');
      await fetchData();
    } catch (e) {
      toast.error('Error: ' + e.message);
    } finally { setWithdrawing(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen pt-20"><Loader2 className="w-8 h-8 animate-spin text-strawberry" /></div>;
  }

  const todayEarnings = transactions
    .filter(t => t.type === 'delivery' && new Date(t.created_date).toDateString() === new Date().toDateString())
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const onboardingComplete = driver?.stripe_onboarding_complete && driver?.stripe_payouts_enabled;
  const hasStripeAccount = !!driver?.stripe_account_id;

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-poppins font-black mb-2">Mis Ganancias 💰</h1>
        <p className="text-muted-foreground mb-8">Pagos reales vía Stripe Connect</p>

        {/* Stripe Connect Onboarding Banner */}
        {!onboardingComplete && (
          <Card className={`p-5 mb-6 border-2 ${hasStripeAccount ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20' : 'border-strawberry bg-strawberry/5'}`}>
            <div className="flex items-start gap-3">
              <AlertCircle className={`w-6 h-6 flex-shrink-0 ${hasStripeAccount ? 'text-amber-600' : 'text-strawberry'}`} />
              <div className="flex-1">
                <h3 className="font-bold mb-1">
                  {hasStripeAccount ? 'Completa tu onboarding de Stripe' : 'Conecta tu cuenta bancaria con Stripe'}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {hasStripeAccount
                    ? 'Termina la verificación para recibir tus pagos directamente en tu banco.'
                    : 'Conecta tu cuenta bancaria de forma segura con Stripe para recibir pagos reales por cada entrega. Tarda 2 minutos.'}
                </p>
                <Button onClick={startStripeOnboarding} disabled={onboarding} className="bg-strawberry hover:bg-strawberry/90 text-white gap-2 rounded-xl">
                  {onboarding ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  {hasStripeAccount ? 'Continuar onboarding' : 'Conectar con Stripe'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {onboardingComplete && (
          <Card className="p-4 mb-6 border-green-300 bg-green-50 dark:bg-green-900/20">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <p className="font-semibold text-sm">Cuenta Stripe conectada · Pagos activos</p>
                <p className="text-xs text-muted-foreground">Los retiros llegan a tu banco en 1-2 días hábiles</p>
              </div>
            </div>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Disponible</p>
              <Wallet className="w-4 h-4 text-strawberry opacity-60" />
            </div>
            <p className="text-2xl font-bold text-strawberry">${(earnings.balance || 0).toFixed(2)}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Pendiente</p>
              <Clock className="w-4 h-4 text-amber-500 opacity-60" />
            </div>
            <p className="text-2xl font-bold text-amber-600">${(earnings.pending_balance || 0).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Liquida en 24h</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Hoy</p>
              <TrendingUp className="w-4 h-4 text-green-600 opacity-60" />
            </div>
            <p className="text-2xl font-bold text-green-600">${todayEarnings.toFixed(2)}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Total ganado</p>
              <DollarSign className="w-4 h-4 opacity-60" />
            </div>
            <p className="text-2xl font-bold">${(earnings.total_earned || 0).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">{earnings.total_deliveries || 0} entregas</p>
          </Card>
        </div>

        {/* Withdrawal */}
        <Card className="p-6 mb-6 bg-gradient-to-br from-strawberry/10 to-card">
          <div className="flex items-center gap-2 mb-4">
            <Banknote className="w-5 h-5 text-strawberry" />
            <h2 className="text-xl font-bold">Retirar a mi banco</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <label className="text-xs text-muted-foreground mb-1 block">Cantidad (USD)</label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder={String(earnings.min_withdrawal || 50)}
                min={earnings.min_withdrawal || 50}
                max={earnings.balance || 0}
                disabled={!onboardingComplete}
                className="w-full px-4 py-2.5 border border-input rounded-xl bg-background disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Mín: ${earnings.min_withdrawal || 50} · Disponible: ${(earnings.balance || 0).toFixed(2)}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => handleWithdraw(true)}
                disabled={withdrawing || !withdrawAmount || !onboardingComplete || parseFloat(withdrawAmount) > (earnings.balance || 0) || parseFloat(withdrawAmount) < (earnings.min_withdrawal || 50)}
                className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white rounded-xl whitespace-nowrap"
              >
                ⚡ {withdrawing ? 'Procesando...' : 'Retiro Instantáneo'}
              </Button>
              <Button
                onClick={() => handleWithdraw(false)}
                disabled={withdrawing || !withdrawAmount || !onboardingComplete || parseFloat(withdrawAmount) > (earnings.balance || 0) || parseFloat(withdrawAmount) < (earnings.min_withdrawal || 50)}
                variant="outline"
                className="gap-2 rounded-xl whitespace-nowrap"
              >
                {withdrawing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Estándar (1-2 días)
              </Button>
            </div>
          </div>
          {!onboardingComplete && (
            <p className="text-xs text-amber-600 mt-3">⚠️ Completa el onboarding de Stripe para habilitar retiros</p>
          )}
          {onboardingComplete && (
            <p className="text-xs text-muted-foreground mt-3">⚡ <strong>Instantáneo:</strong> tu dinero llega en minutos (1.5% fee de Stripe). <strong>Estándar:</strong> gratis, 1-2 días hábiles.</p>
          )}
        </Card>

        {/* Chart */}
        <Card className="p-6 mb-6">
          <h2 className="font-bold mb-4">Ganancias recientes</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={transactions.filter(t => t.type === 'delivery').slice(0, 14).reverse().map(t => ({
              date: new Date(t.created_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
              amount: t.amount,
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="amount" fill="hsl(var(--strawberry))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Transactions */}
        <Card className="p-6">
          <h2 className="font-bold mb-4">Historial de transacciones</h2>
          <div className="space-y-1">
            {transactions.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">Aún no tienes transacciones</p>
            ) : transactions.slice(0, 30).map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-3 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="font-medium capitalize text-sm">{tx.type === 'delivery' ? '🛵 Entrega' : tx.type === 'withdrawal' ? '🏦 Retiro' : tx.type === 'refund' ? '↩️ Reembolso' : tx.type}</p>
                  {tx.description && <p className="text-xs text-muted-foreground truncate">{tx.description}</p>}
                  {tx.order_id && !tx.description && <p className="text-xs text-muted-foreground truncate">Pedido {tx.order_id.slice(-6)}</p>}
                </div>
                <div className="text-right ml-3">
                  <p className={`font-bold text-sm ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.amount > 0 ? '+' : ''}${(tx.amount || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(tx.created_date).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}