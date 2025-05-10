import React from 'react';
import type { Metadata } from 'next';
import { TRPCWrapper } from '../trpc-wrapper';

export const metadata: Metadata = {
  title: 'View Reel | DapDip',
  description: 'Watch and interact with reels on DapDip',
};

export default function ReelViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TRPCWrapper>{children}</TRPCWrapper>;
}