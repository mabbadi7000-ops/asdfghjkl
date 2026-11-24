import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  retryKey: number;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, retryKey: 0 };

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    console.error('[ErrorBoundary] Module render failed:', error.name);
  }

  private retrySection = (): void => {
    this.setState((state) => ({ hasError: false, retryKey: state.retryKey + 1 }));
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <section role="alert" className="flex min-h-72 flex-col items-center justify-center gap-4 rounded-xl border border-amber-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-800">حدث خطأ غير متوقع في عرض هذا القسم - بياناتك آمنة</p>
          <button
            type="button"
            onClick={this.retrySection}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
          >
            إعادة تحميل القسم
          </button>
        </section>
      );
    }

    return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>;
  }
}
