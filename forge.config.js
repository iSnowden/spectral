const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
      config: {
        name: "spectral-portable",
        authors: "iSnowden",
        description: "Portable version of Spectral for macOS."
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32'],
      config: {
        name: "spectral-portable",
        authors: "iSnowden",
        description: "Portable version of Spectral for Windows."
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['linux'],
      config: {
        name: "spectral-portable",
        authors: "iSnowden",
        description: "Portable version of Spectral for Linux."
      },
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'iSnowden',
          name: 'spectral',
        },
        prerelease: false,
        draft: true,
        releaseNotes: "First portable version release.",
        assets: [
          {
            path: "./out/spectral-portable-win32.zip",
            name: "spectral-portable-win32.zip",
            label: "Spectral Portable for Windows"
          },
          {
            path: "./out/spectral-portable-darwin.zip",
            name: "spectral-portable-darwin.zip",
            label: "Spectral Portable for macOS"
          },
          {
            path: "./out/spectral-portable-linux.zip",
            name: "spectral-portable-linux.zip",
            label: "Spectral Portable for Linux"
          }
        ]
      },
    },
  ],
};
