const fs = require('fs');
const path = require('path');
const os = require('os');

console.log("✅ forge.config.js loaded!");

const desktopOut = path.join(os.homedir(), 'Desktop', 'sortify-build');

module.exports = {
  packagerConfig: {
    asar: false
  },
  makers: [
    {
      name: '@electron-forge/maker-zip',
      config: {}
    }
  ],
  hooks: {
    postMake: async (config, results) => {
      const outputFiles = results.flatMap(r => r.artifacts);
      await fs.promises.mkdir(desktopOut, { recursive: true });
      for (const file of outputFiles) {
        const dest = path.join(desktopOut, path.basename(file));
        await fs.promises.copyFile(file, dest);
        console.log(`📦 Copied: ${dest}`);
      }
    }
  }
};
