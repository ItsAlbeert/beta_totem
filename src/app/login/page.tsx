
"use client";

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/icons';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate network delay
    setTimeout(() => {
      if (username === 'admin' && password === 'admin') {
        login('admin');
      } else if (username === 'participant' && password === 'participant') {
        login('participant');
      } else {
        toast({
          title: 'Error de Autenticación',
          description: 'El nombre de usuario o la contraseña son incorrectos.',
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    }, 500);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950">
      <Card className="w-full max-w-sm mx-4">
        <CardHeader className="text-center">
            <div className="flex justify-center items-center gap-2 mb-4">
                 <Icons.Logo className="h-8 w-8 text-primary" />
                 <CardTitle className="text-2xl">Totem 2025</CardTitle>
            </div>
          <CardDescription>
            Introduce tus credenciales para acceder al panel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="admin"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Accediendo...' : 'Acceder'}
            </Button>
            <div className="text-xs text-muted-foreground text-center pt-2">
                <p>Admin: admin / admin</p>
                <p>Participante: participant / participant</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
