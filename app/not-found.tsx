import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold text-gray-200 mb-2">404</p>
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">Página não encontrada</h1>
        <p className="text-gray-500 mb-8">
          A rota que você acessou não existe ou foi movida.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/awq"
            className="px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            AWQ Group
          </Link>
          <Link
            href="/jacqes"
            className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            JACQES
          </Link>
        </div>
      </div>
    </div>
  );
}
