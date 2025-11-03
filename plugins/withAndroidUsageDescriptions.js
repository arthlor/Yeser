/* eslint-disable no-undef */
/* eslint-env node */

const fs = require('fs');
const path = require('path');

const { withStringsXml } = require('@expo/config-plugins');

const ensureArray = (value) => {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
};

const ensureStringItem = (items, name, value) => {
  const existingIndex = items.findIndex((item) => item?.$?.name === name);

  if (existingIndex >= 0) {
    items[existingIndex]._ = value;
    return;
  }

  items.push({
    $: { name },
    _: value,
  });
};

const loadDefaultLocaleStrings = (config, projectRoot) => {
  const locales = config.locales ?? {};
  const defaultLocalePath =
    typeof locales.en === 'string' ? path.resolve(projectRoot, locales.en) : null;

  if (!defaultLocalePath || !fs.existsSync(defaultLocalePath)) {
    return {};
  }

  try {
    const fileContents = fs.readFileSync(defaultLocalePath, 'utf8');
    return JSON.parse(fileContents);
  } catch (error) {
    console.warn('[withAndroidUsageDescriptions] Failed to parse default locale file.', error);
    return {};
  }
};

const withAndroidUsageDescriptions = (config) =>
  withStringsXml(config, (configWithStrings) => {
    const modResults = configWithStrings.modResults;

    if (!modResults.resources) {
      modResults.resources = {};
    }

    const stringResources = ensureArray(modResults.resources.string);
    const projectRoot = configWithStrings.modRequest.projectRoot;
    const defaultLocaleStrings = loadDefaultLocaleStrings(configWithStrings, projectRoot);
    const infoPlist = (configWithStrings.ios && configWithStrings.ios.infoPlist) || {};
    const appName = typeof configWithStrings.name === 'string' ? configWithStrings.name : 'App';

    const requiredStrings = {
      CFBundleDisplayName: defaultLocaleStrings.CFBundleDisplayName || appName,
      NSCameraUsageDescription:
        defaultLocaleStrings.NSCameraUsageDescription ||
        infoPlist.NSCameraUsageDescription ||
        'Camera access is required to attach photos to your gratitude entries.',
      NSPhotoLibraryUsageDescription:
        defaultLocaleStrings.NSPhotoLibraryUsageDescription ||
        infoPlist.NSPhotoLibraryUsageDescription ||
        'Photo library access is required to select photos for your gratitude entries.',
      NSUserTrackingUsageDescription:
        defaultLocaleStrings.NSUserTrackingUsageDescription ||
        infoPlist.NSUserTrackingUsageDescription ||
        'Tracking permissions allow us to personalise your gratitude insights and improve the experience.',
    };

    Object.entries(requiredStrings).forEach(([name, value]) => {
      if (!value) {
        return;
      }

      ensureStringItem(stringResources, name, value);
    });

    modResults.resources.string = stringResources;

    return configWithStrings;
  });

module.exports = withAndroidUsageDescriptions;
