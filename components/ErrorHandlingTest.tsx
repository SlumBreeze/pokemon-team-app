import React, { useState } from 'react';
import { useToast } from './Toast';
import { ErrorBoundary } from './ErrorBoundary';

// Component that throws an error on purpose
const ErrorThrower: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error thrown by ErrorThrower component!');
  }
  return <div className="p-4 bg-green-100 text-green-800 rounded">No error - component is working fine!</div>;
};

// Component that simulates async errors
const AsyncErrorTester: React.FC = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const simulateSuccess = () => {
    showToast('Operation completed successfully!', 'success');
  };

  const simulateError = () => {
    showToast('An error occurred while processing your request', 'error');
  };

  const simulateWarning = () => {
    showToast('Warning: This action cannot be undone', 'warning');
  };

  const simulateInfo = () => {
    showToast('Here is some helpful information', 'info');
  };

  const simulateAsyncError = async () => {
    setLoading(true);
    try {
      // Simulate API call that fails
      await new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Network request failed')), 1000)
      );
    } catch (err: any) {
      showToast(`Async error caught: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const simulateMultipleToasts = () => {
    showToast('First notification', 'info');
    setTimeout(() => showToast('Second notification', 'success'), 500);
    setTimeout(() => showToast('Third notification', 'warning'), 1000);
    setTimeout(() => showToast('Fourth notification', 'error'), 1500);
  };

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-lg">Toast Notification Tests</h3>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={simulateSuccess}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Test Success Toast
        </button>
        <button
          onClick={simulateError}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Test Error Toast
        </button>
        <button
          onClick={simulateWarning}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          Test Warning Toast
        </button>
        <button
          onClick={simulateInfo}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test Info Toast
        </button>
        <button
          onClick={simulateAsyncError}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Test Async Error'}
        </button>
        <button
          onClick={simulateMultipleToasts}
          className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
        >
          Test Multiple Toasts
        </button>
      </div>
    </div>
  );
};

// Main test component
export const ErrorHandlingTest: React.FC = () => {
  const [throwError, setThrowError] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const handleResetErrorBoundary = () => {
    setThrowError(false);
    setResetKey(prev => prev + 1);
  };

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Error Handling Test Suite</h1>

        <div className="space-y-8">
          {/* Toast Tests */}
          <div className="border-2 border-gray-200 rounded-lg p-4">
            <AsyncErrorTester />
          </div>

          {/* Error Boundary Tests */}
          <div className="border-2 border-gray-200 rounded-lg p-4">
            <h3 className="font-bold text-lg mb-3">Error Boundary Tests</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setThrowError(true)}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Trigger Component Error
                </button>
                <button
                  onClick={handleResetErrorBoundary}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Reset Error Boundary
                </button>
              </div>

              <ErrorBoundary key={resetKey}>
                <div className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded">
                  <ErrorThrower shouldThrow={throwError} />
                </div>
              </ErrorBoundary>
            </div>
          </div>

          {/* Test Results Summary */}
          <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-4">
            <h3 className="font-bold text-lg mb-2 text-blue-800">Test Instructions</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-900">
              <li>Click toast buttons to verify notifications appear and auto-dismiss</li>
              <li>Test multiple toasts to verify stacking behavior</li>
              <li>Click "Trigger Component Error" to test Error Boundary</li>
              <li>Verify error details are shown in collapsible section</li>
              <li>Click "Try Again" button in error UI to verify reset functionality</li>
              <li>Test async error to verify error handling in promises</li>
              <li>Check browser console for error logs</li>
            </ul>
          </div>

          {/* Expected Behaviors */}
          <div className="border-2 border-green-200 bg-green-50 rounded-lg p-4">
            <h3 className="font-bold text-lg mb-2 text-green-800">Expected Behaviors</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-green-900">
              <li>✓ Toasts appear in top-right corner with smooth animations</li>
              <li>✓ Toasts auto-dismiss after 5 seconds</li>
              <li>✓ Toast close button (×) dismisses immediately</li>
              <li>✓ Error boundary catches component errors without crashing app</li>
              <li>✓ Error boundary shows user-friendly error UI</li>
              <li>✓ "Try Again" button resets error state</li>
              <li>✓ Async errors are caught and displayed as toasts</li>
              <li>✓ Multiple toasts stack vertically</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorHandlingTest;
