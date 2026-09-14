import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Simulation error boundary caught:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 rounded-card bg-panel border border-accent-danger/50 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-accent-danger/10 text-accent-danger flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <h3 className="font-heading font-bold text-base text-textPrimary">
            {this.props.fallbackTitle || "Simulation Frame Interruption Caught"}
          </h3>
          <p className="text-xs font-mono text-textSecondary max-w-md">
            The safety boundary preserved the application state without crashing (§17).
            {this.state.error?.message ? ` Details: ${this.state.error.message}` : ""}
          </p>
          <button
            onClick={this.handleRetry}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-btn bg-accent-primary text-white text-xs font-mono font-semibold"
          >
            <RefreshCw size={14} />
            <span>Recover Component</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
