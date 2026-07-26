import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary]", error);
  }

  private reset = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-4 text-center sm:p-6">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -left-24 top-[-10%] h-96 w-96 rounded-full bg-destructive/10 blur-[120px]" />
            <div className="absolute -right-24 bottom-[-10%] h-96 w-96 rounded-full bg-brand-blue/10 blur-[120px]" />
          </div>

          <div className="relative flex flex-col items-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/10 text-destructive sm:h-12 sm:w-12">
              <AlertTriangle className="h-6 w-6" />
            </span>
            <h1 className="mt-6 font-display text-xl font-semibold tracking-tight sm:text-2xl">
              Terjadi kesalahan tak terduga
            </h1>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              Halaman gagal dirender. Coba muat ulang; bila berulang, laporkan
              pesan berikut.
            </p>
            <pre className="mt-5 max-w-md overflow-x-auto rounded-xl border bg-muted/50 p-3 text-left font-mono text-xs text-muted-foreground">
              {this.state.error.message}
            </pre>
            <Button onClick={this.reset} size="lg" className="mt-6 font-medium">
              Muat ulang
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
