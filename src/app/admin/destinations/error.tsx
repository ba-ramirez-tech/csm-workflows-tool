"use client";

type DestinationsErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DestinationsError({ error, reset }: DestinationsErrorProps) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-6">
      <h2 className="text-lg font-semibold text-rose-800">Unable to load destinations</h2>
      <p className="mt-2 text-sm text-rose-700">{error.message || "Unexpected error."}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
      >
        Try again
      </button>
    </div>
  );
}
