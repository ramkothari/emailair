'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Oops! Something went wrong
        </h1>

        <p className="mt-4 text-sm text-gray-600">
          {error.message || 'An unexpected error occurred'}
        </p>

        <div className="mt-8">
          <button
            onClick={reset}
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
