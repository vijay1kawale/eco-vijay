'use client';
import { useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';

export default function AuthInitializer() {
  const { user, fetchMe } = useAuthStore();
  useEffect(() => {
    if (!user) fetchMe();
  }, []);
  return null;
}
