import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Page Not Found
        </h1>

        <p className="mt-4 text-sm text-gray-600">
          The page you're looking for doesn't exist.
        </p>

        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex h-8 items-center rounded-full bg-blue-600 px-3 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
