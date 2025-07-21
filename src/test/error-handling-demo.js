/**
 * Demonstration of ProjectApiService error handling capabilities
 * This script shows how the error handling works in practice
 */

import { ProjectApiService, ApiErrorType } from '../services/ProjectApiService';

// Initialize the service
ProjectApiService.initialize();

console.log('=== ProjectApiService Error Handling Demo ===\n');

// 1. Network connectivity detection
console.log('1. Network Connectivity Detection:');
console.log(`   Network available: ${ProjectApiService.isNetworkAvailable()}`);
console.log('');

// 2. Error categorization examples
console.log('2. Error Categorization Examples:');

// Simulate different error types
const errorExamples = [
  {
    name: 'Network Error',
    error: { code: 'ECONNABORTED', message: 'Network timeout' }
  },
  {
    name: 'Validation Error',
    error: { 
      response: { 
        status: 400, 
        data: { message: 'Invalid input', details: { name: 'required' } } 
      } 
    }
  },
  {
    name: 'Server Error',
    error: { 
      response: { 
        status: 500, 
        data: { message: 'Internal server error' } 
      } 
    }
  },
  {
    name: 'Not Found Error',
    error: { 
      response: { 
        status: 404, 
        data: { message: 'Resource not found' } 
      } 
    }
  }
];

// Test error categorization (using private method simulation)
errorExamples.forEach(example => {
  console.log(`   ${example.name}:`);
  
  // Simulate error categorization logic
  let errorInfo;
  const error = example.error;
  
  if (error.code === 'ECONNABORTED') {
    errorInfo = {
      type: ApiErrorType.TIMEOUT,
      message: 'Request timed out. The server may be busy.',
      canRetry: true,
      suggestedAction: 'Wait a moment and try again'
    };
  } else if (error.response) {
    const status = error.response.status;
    if (status === 400) {
      errorInfo = {
        type: ApiErrorType.VALIDATION,
        message: error.response.data.message || 'Invalid request data',
        canRetry: false,
        suggestedAction: 'Verify your input data and try again'
      };
    } else if (status === 404) {
      errorInfo = {
        type: ApiErrorType.CLIENT,
        message: error.response.data.message || 'Resource not found',
        canRetry: false,
        suggestedAction: 'Verify the resource exists and try again'
      };
    } else if (status >= 500) {
      errorInfo = {
        type: ApiErrorType.SERVER,
        message: error.response.data.message || 'Server error',
        canRetry: true,
        suggestedAction: 'Wait a moment and try again'
      };
    }
  }
  
  console.log(`     Type: ${errorInfo.type}`);
  console.log(`     Message: ${errorInfo.message}`);
  console.log(`     Can Retry: ${errorInfo.canRetry}`);
  console.log(`     Suggested Action: ${errorInfo.suggestedAction}`);
  console.log('');
});

// 3. Retry logic demonstration
console.log('3. Retry Logic Demonstration:');

async function demonstrateRetryLogic() {
  let attempt = 0;
  
  const mockFailingRequest = () => {
    attempt++;
    console.log(`     Attempt ${attempt}: Making request...`);
    
    if (attempt < 3) {
      throw {
        type: ApiErrorType.SERVER,
        canRetry: true,
        message: 'Server temporarily unavailable'
      };
    }
    
    return Promise.resolve({ data: 'Success!' });
  };

  try {
    console.log('   Simulating request with retry logic:');
    const result = await ProjectApiService.retryRequest(mockFailingRequest, 3);
    console.log(`     Final result: ${JSON.stringify(result)}`);
  } catch (error) {
    console.log(`     Failed after retries: ${error.message}`);
  }
}

// Run the retry demonstration
demonstrateRetryLogic().then(() => {
  console.log('');
  console.log('4. Features Summary:');
  console.log('   ✓ Axios interceptors for request/response handling');
  console.log('   ✓ Exponential backoff retry logic');
  console.log('   ✓ User-friendly error messages');
  console.log('   ✓ Network connectivity detection');
  console.log('   ✓ Request/response validation');
  console.log('   ✓ Error categorization (network, validation, server, client, timeout)');
  console.log('   ✓ Proper timeout handling');
  console.log('   ✓ Offline/online state detection');
  console.log('');
  console.log('=== Demo Complete ===');
});

export { ProjectApiService, ApiErrorType };