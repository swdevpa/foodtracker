const withHealthKit = (config) => {
  if (!config.ios) {
    config.ios = {};
  }

  if (!config.ios.infoPlist) {
    config.ios.infoPlist = {};
  }

  // Add HealthKit capability to Info.plist
  config.ios.infoPlist.NSHealthShareUsageDescription = 
    "This app uses HealthKit to import your health data like weight, height, and activity to provide personalized meal recommendations.";
  config.ios.infoPlist.NSHealthUpdateUsageDescription = 
    "This app uses HealthKit to save nutritional information from your meals to your Health app.";
  config.ios.infoPlist.NSHealthClinicalHealthRecordsShareUsageDescription = 
    "This app does not access clinical health records.";

  // Add HealthKit entitlement
  if (!config.ios.entitlements) {
    config.ios.entitlements = {};
  }
  
  config.ios.entitlements['com.apple.developer.healthkit'] = true;

  return config;
};

module.exports = withHealthKit;