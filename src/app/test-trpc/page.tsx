"use client";

import { useState } from "react";
import { api } from "@/providers/trpc-provider";
import Link from "next/link";

export default function TestTrpc() {
  const [error, setError] = useState<string | null>(null);
  const [pingData, setPingData] = useState<{ status: string; timestamp: string } | null>(null);
  const [helloData, setHelloData] = useState<{ greeting: string; timestamp: string } | null>(null);

  // Use the actual tRPC hooks
  const pingQuery = api.test.ping.useQuery(undefined, {
    onSuccess: (data) => {
      console.log("Ping success:", data);
      setPingData(data);
    },
    onError: (err) => {
      console.error("Ping error:", err);
      setError(`Ping error: ${err.message}`);
    },
    retry: false,
  });

  const helloQuery = api.test.hello.useQuery(
    { name: "tRPC User" },
    {
      onSuccess: (data) => {
        console.log("Hello success:", data);
        setHelloData(data);
      },
      onError: (err) => {
        console.error("Hello error:", err);
        setError(`Hello error: ${err.message}`);
      },
      retry: false,
    }
  );

  return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-card p-6 rounded-lg shadow-sm border">
        <h1 className="text-2xl font-bold mb-4">tRPC Test Page</h1>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Ping Test</h2>
          {pingQuery.isLoading ? (
            <div className="py-2">Loading ping data...</div>
          ) : pingQuery.isError ? (
            <div className="py-2 text-destructive">
              Error: {pingQuery.error.message}
            </div>
          ) : pingData ? (
            <div className="py-2 text-green-600">
              <p>Status: {pingData.status}</p>
              <p>Timestamp: {pingData.timestamp}</p>
            </div>
          ) : (
            <div className="py-2 text-yellow-600">No ping data available</div>
          )}
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Hello Test</h2>
          {helloQuery.isLoading ? (
            <div className="py-2">Loading hello data...</div>
          ) : helloQuery.isError ? (
            <div className="py-2 text-destructive">
              Error: {helloQuery.error.message}
            </div>
          ) : helloData ? (
            <div className="py-2 text-green-600">
              <p>Greeting: {helloData.greeting}</p>
              <p>Timestamp: {helloData.timestamp}</p>
            </div>
          ) : (
            <div className="py-2 text-yellow-600">No hello data available</div>
          )}
        </div>

        {error && (
          <div className="py-4 mb-4 text-destructive bg-destructive/10 rounded-md p-3">
            <p className="font-medium">Error:</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        <div className="mt-6 pt-4 border-t">
          <Link href="/" className="text-primary hover:underline">Return to Home</Link>
        </div>
      </div>
    </div>
  );
}