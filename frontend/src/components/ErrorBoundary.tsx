import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// React only supports error boundaries via class components (no hook
// equivalent) - without this, an unhandled render error on any page (e.g. a
// malformed API response feeding a .map()) white-screens the whole app with
// no recovery but a manual reload.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-24 text-center">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="text-sm text-[var(--text-muted)]">{this.state.error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)]"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
