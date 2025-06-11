import React from 'react';

import RootNavigator from './RootNavigator';

/**
 * 🚨 NAVIGATION FIX: Removed duplicate NavigationContainer
 *
 * **ISSUE**: Having NavigationContainer here AND in App.tsx caused
 * "NAVIGATE action with payload" errors due to nested navigation containers.
 *
 * **SOLUTION**: App.tsx already wraps RootNavigator with NavigationContainer,
 * so this component now just returns RootNavigator directly.
 */
const AppNavigator: React.FC = () => {
  return <RootNavigator />;
};

export default AppNavigator;
