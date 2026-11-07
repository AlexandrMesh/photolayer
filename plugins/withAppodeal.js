/**
 * Expo config plugin: Appodeal Android maven + slim mediation adapters.
 * Skips AdMob / Meta / Firebase adapters (need extra app IDs).
 * Skips Yandex adapter — RU traffic uses direct yandex-mobile-ads.
 * Forces Play Billing Library ≥8.0.0 (Play Console rejects 7.x from mediation).
 */
const {
  withAppBuildGradle,
  withProjectBuildGradle,
  withSettingsGradle,
  createRunOncePlugin,
} = require('@expo/config-plugins');

const MAVEN = 'https://artifactory.appodeal.com/appodeal';
const BILLING = '8.0.0';

const ADAPTERS = [
  "implementation('com.appodeal.ads.sdk.adapters:unity_ads:4.17.0.0')",
  "implementation('com.appodeal.ads.sdk.adapters:vungle:7.7.4.0')",
  "implementation('com.appodeal.ads.sdk.adapters:applovin:13.6.3.0')",
  "implementation('com.appodeal.ads.sdk.adapters:bidmachine:3.7.1.0')",
  "implementation('com.appodeal.ads.sdk.adapters:mintegral:17.1.61.0')",
  "implementation('com.appodeal.ads.sdk.adapters:my_target:5.47.1.0')",
  "implementation('com.appodeal.ads.sdk.adapters:ironsource:9.4.4.0')",
  "implementation('com.appodeal.ads.sdk.adapters:bigo_ads:5.9.0.0')",
  "implementation('com.appodeal.ads.sdk.adapters:moloco:4.3.1.0')",
  "implementation('com.appodeal.ads.sdk.adapters:ogury:6.2.0.0')",
];

const MARKER_START = '// @generated begin appodeal-adapters';
const MARKER_END = '// @generated end appodeal-adapters';
const BILLING_MARKER = '// @generated begin play-billing-force';

function ensureMavenBlock(contents) {
  if (contents.includes(MAVEN)) return contents;
  const line = `        maven { url "${MAVEN}" }`;
  if (contents.includes('allprojects')) {
    return contents.replace(
      /allprojects\s*\{\s*repositories\s*\{/,
      `allprojects {\n    repositories {\n${line}`,
    );
  }
  return `${contents}\nallprojects {\n    repositories {\n${line}\n    }\n}\n`;
}

function ensureSettingsMaven(contents) {
  if (contents.includes(MAVEN)) return contents;
  const line = `    maven { url "${MAVEN}" }`;
  if (/dependencyResolutionManagement[\s\S]*repositories\s*\{/.test(contents)) {
    return contents.replace(
      /(dependencyResolutionManagement[\s\S]*repositories\s*\{)/,
      `$1\n${line}`,
    );
  }
  if (/repositories\s*\{/.test(contents)) {
    return contents.replace(/repositories\s*\{/, `repositories {\n${line}`);
  }
  return `${contents}\ndependencyResolutionManagement {\n  repositories {\n${line}\n  }\n}\n`;
}

function ensureAdapters(contents) {
  if (contents.includes(MARKER_START)) return contents;
  const block = [MARKER_START, ...ADAPTERS, MARKER_END].join('\n        ');
  if (/dependencies\s*\{/.test(contents)) {
    return contents.replace(/dependencies\s*\{/, `dependencies {\n        ${block}`);
  }
  return `${contents}\ndependencies {\n        ${block}\n}\n`;
}

function ensureBillingForce(contents) {
  if (contents.includes(BILLING_MARKER)) return contents;
  const block = `
${BILLING_MARKER}
configurations.configureEach {
    resolutionStrategy {
        force 'com.android.billingclient:billing:${BILLING}'
        force 'com.android.billingclient:billing-ktx:${BILLING}'
    }
}
// @generated end play-billing-force
`;
  return `${contents.trimEnd()}\n${block}\n`;
}

function withAppodeal(config) {
  config = withSettingsGradle(config, (cfg) => {
    if (cfg.modResults.language === 'groovy') {
      cfg.modResults.contents = ensureSettingsMaven(cfg.modResults.contents);
    }
    return cfg;
  });
  config = withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language === 'groovy') {
      cfg.modResults.contents = ensureMavenBlock(cfg.modResults.contents);
    }
    return cfg;
  });
  config = withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language === 'groovy') {
      let next = ensureAdapters(cfg.modResults.contents);
      next = ensureBillingForce(next);
      cfg.modResults.contents = next;
    }
    return cfg;
  });
  return config;
}

module.exports = createRunOncePlugin(withAppodeal, 'withAppodeal', '1.0.1');
