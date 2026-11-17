import { Component, type ErrorInfo, type ReactNode } from 'react'
import '@/components/buddy-ui/buddy-ui.css'

interface Props {
  children: ReactNode
  fallbackTitle?: string
  onBack?: () => void
  wrapFallback?: (content: ReactNode) => ReactNode
}

interface State {
  hasError: boolean
  /** Nenačetl se soubor modulu (typicky po novém nasazení, kdy má zařízení
   *  ještě starý build). React.lazy si odmítnutý import pamatuje, takže
   *  pouhé překreslení nepomůže — pomůže jen načíst stránku znovu. */
  chunkError: boolean
}

const jeChybaNacteniModulu = (error: Error): boolean =>
  /dynamically imported module|Importing a module script failed|Loading chunk|Loading CSS chunk|error loading dynamically/i.test(
    `${error?.name ?? ''} ${error?.message ?? ''}`
  )

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, chunkError: false }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, chunkError: jeChybaNacteniModulu(error) }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      const fallback = (
        <div className="buddy-ui-fallback">
          <div className="buddy-ui-alert" role="alert">
            <h2>{this.props.fallbackTitle || 'Aplikaci se nepodařilo načíst'}</h2>
            <p>
              {this.state.chunkError
                ? 'Část appky se nepodařilo stáhnout — nejspíš máš starou verzi nebo slabý signál. Načti appku znovu.'
                : 'Při otevření této sekce nastala chyba.'}
            </p>
          </div>
          <div className="buddy-ui-fallback-actions">
            {this.props.onBack && (
              <button type="button" className="buddy-ui-button" onClick={this.props.onBack}>
                Zpět
              </button>
            )}
            <button
              type="button"
              className="buddy-ui-button"
              onClick={() => {
                if (this.state.chunkError) window.location.reload()
                else this.setState({ hasError: false, chunkError: false })
              }}
            >
              {this.state.chunkError ? 'Načíst appku znovu' : 'Zkusit znovu'}
            </button>
          </div>
        </div>
      )
      return this.props.wrapFallback?.(fallback) ?? fallback
    }

    return this.props.children
  }
}
