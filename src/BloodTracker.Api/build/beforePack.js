const fs = require("fs");
const path = require("path");

module.exports = async function (context) {
    // Этот файл: src/BloodTracker.Api/build/beforePack.js
    // Манифест:  src/BloodTracker.Api/electron.manifest.json
    const src = path.resolve(__dirname, "..", "electron.manifest.json");
    const appDir = context.appDir || context.projectDir || context.packager?.appInfo?.projectDir;
    if (!appDir) {
        throw new Error("beforePack: appDir is undefined in context");
    }
    const dst = path.join(appDir, "electron.manifest.json");

    if (!fs.existsSync(src)) {
        throw new Error(`beforePack: manifest not found: ${src}`);
    }

    fs.copyFileSync(src, dst);
    console.log(`beforePack: copied manifest -> ${dst}`);
};
