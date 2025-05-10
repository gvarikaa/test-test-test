import React from 'react';
import type { Metadata } from 'next';
import { TRPCWrapper } from '../trpc-wrapper';

export const metadata: Metadata = {
  title: 'Create Reel | DapDip',
  description: 'Create and share short vertical videos.',
};

export default function CreateReelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TRPCWrapper>{children}</TRPCWrapper>;
}