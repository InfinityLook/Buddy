import { Component, type ErrorInfo, type ReactNode } from 'react'
import '@/components/buddy-ui/buddy-ui.css'

interface Props {
  children: ReactNode
  fallbackTitle?: string
  onBack?: () => void
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false }

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="buddy-ui-fallback">
          <div className="buddy-ui-alert" role="alert">
            <h2>{this.props.fallbackTitle || 'Aplikaci se nepodařilo načíst'}</h2>
            <p>Při otevření této sekce nastala chyba.</p>
          </div>
          <div className="buddy-ui-fallback-actions">
            {this.props.onBack && (
              <button type="button" className="buddy-ui-button" onClick={this.props.onBack}>
                Zpět
              </button>
            )}
            <button type="button" className="buddy-ui-button" onClick={() => this.setState({ hasError: false })}>
              Zkusit znovu
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
