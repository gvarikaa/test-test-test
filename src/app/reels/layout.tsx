import React from 'react';
import type { Metadata } from 'next';
import { TRPCWrapper } from './trpc-wrapper';

export const metadata: Metadata = {
  title: 'Reels | DapDip',
  description: 'Watch short vertical videos, create and share your own.',
};

export default function ReelsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TRPCWrapper>{children}</TRPCWrapper>;
}