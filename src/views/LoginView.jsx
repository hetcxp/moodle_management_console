import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AuthService } from '../services/auth';
import { getTenantConfig } from '../config/tenant';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { KeyRound, User, Lock, Sparkles, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export const LoginView = () => {
  const { login, loginWithToken } = useAuth();
  const tenant = getTenantConfig();

  const [mode, setMode] = useState('credentials'); // 'credentials' | 'token'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() && !password.trim()) {
      setError('El usuario y la contraseña son obligatorios.');
      return;
    }
    if (!username.trim()) {
      setError('El usuario es obligatorio.');
      return;
    }
    if (!password.trim()) {
      setError('La contraseña es obligatoria.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(username, password);
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('conexion') || msg.includes('conexión')) {
        setError('Error de red: no fue posible conectar con el servidor Moodle. Verifica tu conexión.');
      } else if (msg.includes('invalidlogin') || msg.includes('Credenciales') || msg.includes('inválidas')) {
        setError('Usuario o contraseña incorrectos. Verifica tus credenciales.');
      } else {
        setError(msg || 'Error de autenticación.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTokenSubmit = async (e) => {
    e.preventDefault();
    if (!manualToken.trim()) {
      setError('Por favor ingresa un token de Web Service.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await loginWithToken(manualToken.trim());
    } catch (err) {
      setError(err.message || 'Token inválido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/30 to-primary/5 overflow-hidden">
      {/* Glow decorative blobs */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fadeIn">
        {/* Brand identity banner */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-blue-500 text-white shadow-xl shadow-primary/25 mb-4">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            {tenant.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Panel Administrativo Desacoplado para Moodle 5.x
          </p>
        </div>

        <Card className="border-border/80 shadow-2xl backdrop-blur-xl bg-card/90">
          <CardHeader className="pb-4">
            {AuthService.isEmbedded() && (
              <p className="text-[11px] text-primary/80 bg-primary/5 border border-primary/15 rounded-lg px-3 py-2 mb-3">
                Acceso embebido detectado — usa <strong>Token de Administrador</strong> para conectar.
              </p>
            )}
            <div role="tablist" aria-label="Método de autenticación" className="flex rounded-lg bg-muted p-1 text-xs font-semibold">
              <button
                type="button"
                role="tab"
                id="tab-credentials"
                aria-selected={mode === 'credentials'}
                aria-controls="panel-credentials"
                onClick={() => { setMode('credentials'); setError(''); }}
                className={`flex-1 py-1.5 rounded-md transition-all ${
                  mode === 'credentials' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Usuario y Contraseña
              </button>
              <button
                type="button"
                role="tab"
                id="tab-token"
                aria-selected={mode === 'token'}
                aria-controls="panel-token"
                onClick={() => { setMode('token'); setError(''); }}
                className={`flex-1 py-1.5 rounded-md transition-all ${
                  mode === 'token' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Token de Administrador
              </button>
            </div>
          </CardHeader>

          <CardContent>
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-4 flex items-start gap-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-600 dark:text-rose-400"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {mode === 'credentials' ? (
              <form
                id="panel-credentials"
                role="tabpanel"
                aria-labelledby="tab-credentials"
                onSubmit={handleCredentialsSubmit}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label htmlFor="login-username" className="text-xs font-bold text-foreground">
                    Usuario de Moodle
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="login-username"
                      name="username"
                      autoComplete="username"
                      type="text"
                      placeholder="admin"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="login-password" className="text-xs font-bold text-foreground">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="login-password"
                      name="password"
                      autoComplete="current-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full h-11 text-sm font-semibold mt-2 gap-2">
                  {loading ? 'Iniciando sesión...' : 'Acceder al Panel'}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </form>
            ) : (
              <form
                id="panel-token"
                role="tabpanel"
                aria-labelledby="tab-token"
                onSubmit={handleTokenSubmit}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label htmlFor="login-token" className="text-xs font-bold text-foreground">
                    Web Service Token
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="login-token"
                      name="token"
                      autoComplete="off"
                      type="password"
                      placeholder="Pega tu wstoken de adminer_service..."
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      className="pl-9 font-mono text-xs"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Generado en <i>Moodle → Servidor → Web Services → Tokens</i>.
                  </p>
                </div>

                <Button type="submit" disabled={loading} className="w-full h-11 text-sm font-semibold mt-2 gap-2">
                  {loading ? 'Validando...' : 'Conectar con Token'}
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Footer info */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          Conectado con backend: <span className="font-mono text-foreground">{tenant.moodleUrl}</span>
        </div>
      </div>
    </div>
  );
};
