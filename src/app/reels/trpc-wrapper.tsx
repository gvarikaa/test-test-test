'use client';

import React from 'react';
import { TRPCProvider } from '@/providers/trpc-provider';

export function TRPCWrapper({ children }: { children: React.ReactNode }) {
  return <TRPCProvider>{children}</TRPCProvider>;
}