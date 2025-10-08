// Test script to check if analytics are working
// Run this in your browser console to test tracking

// Test 1: Check if analytics object exists
console.log('Analytics object:', window.simpleAnalytics);

// Test 2: Try to track a test event
if (window.simpleAnalytics) {
  window.simpleAnalytics.trackEvent('test_event', { test: true });
  console.log('Test event sent');
} else {
  console.log('Analytics not found - check if the import is working');
}

// Test 3: Check Supabase connection
console.log('Supabase client:', window.supabase);









