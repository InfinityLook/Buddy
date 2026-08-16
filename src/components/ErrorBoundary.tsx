import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
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
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '16px',
          margin: '1rem 0',
          color: '#fff'
        }}>
          <h3 style={{ color: '#ef4444', margin: '0 0 0.5rem 0' }}>
            {this.props.fallbackTitle || 'Aplikaci se nepodařilo načíst'}
          </h3>
          <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '1rem' }}>
            Vyskytla se chybička při otvírání této sekce.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Zkusit znovu
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
