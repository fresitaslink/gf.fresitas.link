import React, { useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import RecipeManager from '@/components/admin/RecipeManager';

export default function RecipeAdmin() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    if (!['admin', 'owner', 'manager'].includes(user.role)) {
      toast.error('Acceso restringido');
      navigate('/');
    }
  }, [user]);

  if (!user) return null;
  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        <RecipeManager />
      </div>
    </div>
  );
}