"use client";

import { useEffect } from "react";

export default function AwqError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AwqError]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="text-center max-w-sm">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Erro ao carregar</h2>
        <p className="text-gray-500 text-sm mb-4">
          {error.message?.includes("allowlist") || error.message?.includes("fetch")
            ? "Não foi possível conectar ao banco de dados."
            : error.message || "Erro inesperado."}
        </p>
        {error.digest && (
          <p className="text-gray-400 text-xs mb-4 font-mono">ref: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
