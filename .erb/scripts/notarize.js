require('dotenv').config();
const { notarize } = require('@electron/notarize');
const { build } = require('../../package.json');

exports.default = async function notarizeMacos(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') {
    return;
  }

  // if (process.env.CI !== 'true') {
  //   console.warn('Skipping notarizing step. Packaging is not running in CI');
  //   return;
  // }

  // if (!('APPLE_ID' in process.env && 'APPLE_ID_PASS' in process.env)) {
  //   console.warn(
  //     'Skipping notarizing step. APPLE_ID and APPLE_ID_PASS env variables must be set'
  //   );
  //   return;
  // }

  const appName = context.packager.appInfo.productFilename;

  await notarize({
    appBundleId: build.appId,
    appPath: `${appOutDir}/${appName}.app`,
    teamId: process.env.A_TEAM,
    appleId: process.env.A_EMAIL,
    appleIdPassword: process.env.A_PWD,
    tool: 'notarytool',
  });
};
