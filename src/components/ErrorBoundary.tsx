import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { withTranslation, WithTranslation } from 'react-i18next';

interface Props extends WithTranslation {
  children: ReactNode;
  resetKey?: string;
  userId?: string;
  userEmail?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

// Report error to backend
const reportError = async (
  error: Error,
  errorInfo: { componentStack?: string },
  userId?: string,
  userEmail?: string
) => {
  try {
    const payload = {
      user_id: userId || null,
      user_email: userEmail || null,
      error_message: error.message || 'Unknown error',
      error_stack: error.stack || null,
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      metadata: {
        componentStack: errorInfo?.componentStack || null,
        timestamp: new Date().toISOString(),
        pathname: window.location.pathname,
        search: window.location.search
      }
    };

    await fetch('https://dhqdamfisdbbcieqlpvt.supabase.co/functions/v1/report-error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
  } catch (reportErr) {
    // Silently fail - don't show errors about error reporting
    console.warn('[ErrorBoundary] Failed to report error:', reportErr);
  }
};

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error state when route changes
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: undefined });
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    
    // Report error to backend
    reportError(error, errorInfo, this.props.userId, this.props.userEmail);
  }

  render() {
    const { t } = this.props;
    
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
          <div className="text-center max-w-md">
            <h2 className="text-xl font-semibold mb-2">
              {t('errorBoundary.title')}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {t('errorBoundary.description')}
            </p>
            <div className="flex gap-2 justify-center mb-6">
              <Button onClick={() => window.location.reload()}>
                {t('errorBoundary.refreshPage')}
              </Button>
              <Button variant="outline" onClick={() => window.history.back()}>
                {t('errorBoundary.goBack')}
              </Button>
            </div>
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {t('errorBoundary.supportText')}
              </p>
              <a 
                href="mailto:info@produktpix.com" 
                className="text-sm text-primary hover:underline font-medium"
              >
                info@produktpix.com
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryClass);
