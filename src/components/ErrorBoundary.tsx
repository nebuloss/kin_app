import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

/** Catches render errors so a bad state can't leave the user with a blank screen. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-sm text-center space-y-4">
            <div className="text-4xl">🀄</div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Une erreur est survenue</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 break-words">{this.state.error.message}</p>
            <button
              onClick={() => location.reload()}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              Recharger
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
