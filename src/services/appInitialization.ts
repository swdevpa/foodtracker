/**
 * App Initialization Service
 * Handles secure app registration with API proxy on first launch
 */

import { secureAuth } from '../utils/secureAuth';

class AppInitializationService {
  private readonly REGISTRATION_KEY = '@foodtracker/app_registered';
  private readonly API_BASE_URL = 'https://foodtracker-api-proxy.swdev-pa.workers.dev';

  /**
   * Initialize app security on first launch
   */
  async initializeApp(): Promise<boolean> {
    try {
      // Check if app is already registered
      const isRegistered = await this.isAppRegistered();
      if (isRegistered) {
        console.log('App already registered with secure auth');
        return true;
      }

      console.log('First launch - registering app with secure auth...');
      
      // Initialize secure authentication
      await secureAuth.initialize();
      
      // Register app with API proxy
      const registrationSuccess = await secureAuth.registerWithServer(this.API_BASE_URL);
      
      if (registrationSuccess) {
        await this.markAppAsRegistered();
        console.log('App successfully registered with enterprise security');
        return true;
      } else {
        console.error('App registration failed');
        return false;
      }
      
    } catch (error) {
      console.error('App initialization failed:', error);
      return false;
    }
  }

  /**
   * Check if app is already registered
   */
  private async isAppRegistered(): Promise<boolean> {
    try {
      // In production, use expo-secure-store
      return global.__FOODTRACKER_APP_REGISTERED === true;
    } catch {
      return false;
    }
  }

  /**
   * Mark app as registered
   */
  private async markAppAsRegistered(): Promise<void> {
    try {
      // In production, use expo-secure-store
      global.__FOODTRACKER_APP_REGISTERED = true;
    } catch (error) {
      console.error('Failed to mark app as registered:', error);
    }
  }

  /**
   * Get app registration status for debugging
   */
  async getRegistrationStatus(): Promise<{
    registered: boolean;
    hasKeyPair: boolean;
    apiReachable: boolean;
  }> {
    try {
      const registered = await this.isAppRegistered();
      
      // Test API connectivity
      let apiReachable = false;
      try {
        const response = await fetch(`${this.API_BASE_URL}/api/health`);
        apiReachable = response.ok;
      } catch {
        apiReachable = false;
      }

      return {
        registered,
        hasKeyPair: true, // SecureAuth generates on demand
        apiReachable
      };
    } catch {
      return {
        registered: false,
        hasKeyPair: false,
        apiReachable: false
      };
    }
  }
}

// Global registration state
declare global {
  var __FOODTRACKER_APP_REGISTERED: boolean | undefined;
}

export const appInit = new AppInitializationService();
export default appInit;