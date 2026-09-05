import { Component, type ErrorInfo, type ReactNode } from "react"

type Props = { children: ReactNode }
type State = { error: Error | null }

/**
 * Without this, any render-time throw takes the whole panel to a blank white
 * screen with the reason only visible in the console.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Admin panel crashed:", error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="min-h-[100dvh] bg-[#0a0a0a] text-white flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg bg-[#111111] border border-white/10 rounded-2xl p-5 sm:p-6">
          <h1 className="text-lg font-semibold mb-2">Something broke</h1>
          <p className="text-gray-400 text-sm mb-4">
            The page hit an unexpected error. Reloading usually clears it — if it
            keeps happening, send this message on.
          </p>

          <pre className="bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-red-300 overflow-x-auto mb-5">
            {error.message}
          </pre>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => window.location.reload()} className="btn btn-primary">
              Reload
            </button>
            <button
              onClick={() => this.setState({ error: null })}
              className="btn btn-secondary"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }
}
