import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[RideSync] App render failed:', error);
    console.error('[RideSync] Component stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[#0b1220] px-5 py-10 text-white">
          <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#38d9f5]">
              RideSync recovery
            </p>
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="mt-3 text-sm leading-6 text-white/70">
              RideSync could not load this screen. Reload the app to try again.
              If the problem continues, share the technical details below with the developer.
            </p>
            {this.state.error?.message && (
              <details className="mt-4 rounded-lg bg-black/30 p-3 text-left">
                <summary className="cursor-pointer text-sm font-medium text-white/80">
                  Technical details
                </summary>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs text-red-200">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 w-full rounded-xl bg-[#38d9f5] px-4 py-3 text-sm font-bold text-[#07131c] transition hover:bg-[#7ae7fa]"
            >
              Reload RideSync
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
