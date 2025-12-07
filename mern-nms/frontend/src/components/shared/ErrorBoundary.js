import React from 'react';
import { Alert, Button, Card, Container } from 'react-bootstrap';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error, errorInfo);
    }
    
    // In production, you might want to send this to an error reporting service
    // Example: sendErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
          <Card style={{ maxWidth: '600px', width: '100%' }}>
            <Card.Header className="bg-danger text-white">
              <h5 className="mb-0">
                <i className="fas fa-exclamation-triangle me-2"></i>
                Something went wrong
              </h5>
            </Card.Header>
            <Card.Body>
              <Alert variant="danger">
                <h6>An unexpected error occurred</h6>
                <p className="mb-0">
                  The application encountered an error and couldn't recover. 
                  Please try refreshing the page or contact support if the problem persists.
                </p>
              </Alert>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-3">
                  <summary className="text-muted cursor-pointer">
                    <small>Error Details (Development Mode)</small>
                  </summary>
                  <pre className="mt-2 p-2 bg-light border rounded small">
                    <code>
                      {this.state.error.toString()}
                      {'\n\n'}
                      {this.state.errorInfo.componentStack}
                    </code>
                  </pre>
                </details>
              )}
              
              <div className="d-flex gap-2 mt-3">
                <Button variant="primary" onClick={this.handleReset}>
                  <i className="fas fa-redo me-2"></i>
                  Try Again
                </Button>
                <Button variant="outline-secondary" onClick={() => {
                  try {
                    window.location.reload();
                  } catch (error) {
                    // Fallback if reload fails
                    console.error('Failed to reload page:', error);
                  }
                }}>
                  <i className="fas fa-sync-alt me-2"></i>
                  Reload Page
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;