import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react';

interface LegalPageLayoutProps {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}

export default function LegalPageLayout({
  title,
  updatedAt,
  children,
}: LegalPageLayoutProps) {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/signup"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-ridesync-700 hover:text-ridesync-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to sign up
        </Link>

        <article className="rounded-2xl border border-gray-200 bg-white px-5 py-7 shadow-card sm:px-9 sm:py-10">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ridesync-50 text-ridesync-700">
              {title === 'Privacy Policy' ? (
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              ) : (
                <FileText className="h-5 w-5" aria-hidden="true" />
              )}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ridesync-700">RideSync legal</p>
              <p className="text-xs text-charcoal-muted">Last updated: {updatedAt}</p>
            </div>
          </div>

          <h1 className="mb-3 text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
            {title}
          </h1>

          <div className="mb-7 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
            <strong>Review draft:</strong> This document is a product-information draft and is not legal advice.
            Before opening RideSync to the public, the operator's legal identity, contact details, applicable
            jurisdiction and final legal wording must be reviewed and completed.
          </div>

          <div className="legal-content space-y-6 text-sm leading-7 text-charcoal-soft">
            {children}
          </div>

          <div className="mt-10 border-t border-gray-100 pt-5 text-sm text-charcoal-muted">
            <p>Related document:</p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 font-semibold text-ridesync-700">
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms of Service</Link>
            </div>
          </div>
        </article>

        <p className="mt-5 text-center text-xs text-charcoal-muted">
          RideSync helps riding groups coordinate. Ride safely and follow local road laws.
        </p>
      </div>
    </main>
  );
}
