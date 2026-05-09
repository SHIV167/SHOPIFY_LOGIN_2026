import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-xl rounded-lg bg-white p-8 shadow">
        <h1 className="text-3xl font-semibold text-gray-900">LoginRegister</h1>
        <p className="mt-2 text-gray-600">
          Customer login and registration for Shopify stores.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800"
            href="/install"
          >
            Install App
          </Link>
        </div>
      </div>
    </main>
  );
}
