const fs = require('fs');
const https = require('https');
const path = require('path');

const inputPath = process.argv[2];
if (!inputPath) {
    console.error('Usage: node generate-icon-css.js <path-to-json>');
    process.exit(1);
}

const LOCAL_CSS_DIR = path.join(__dirname, 'vendor');
const LOCAL_CSS_PATH = path.join(LOCAL_CSS_DIR, 'lucide.css');
const LUCIDE_CSS_URL = 'https://unpkg.com/lucide-static@0.535.0/font/lucide.css';

const GENERATED_CSS_PATH = path.join(__dirname, 'theme', 'jellyfin-lucide.css');

const MAIN_CONTENT =
    `/* Jellyfin Lucide Icons Theme by KartoffelChipss */\n` +
    `/* using lucide Icons licensed under the ISC License: https://lucide.dev/license */\n` +
    `@import url("${LUCIDE_CSS_URL}");` +
    '.material-icons{' +
    'font-family:lucide!important;font-weight:400;font-style:normal;display:inline-block;' +
    'line-height:1;text-transform:none;letter-spacing:normal;word-wrap:normal;' +
    'white-space:nowrap;direction:ltr;-webkit-font-smoothing:antialiased;' +
    'text-rendering:optimizeLegibility;-moz-osx-font-smoothing:grayscale;' +
    'font-feature-settings:"liga"}button .material-icon{margin-top:3px}' +
    '.material-icons.info_outline:before{font-family:lucide!important;}' +
    '.btnPlay.detailButton .detailButton-content span.material-icons{margin-right:3px} ' +
    '.play-button:before{content:"\\e140";font-family:lucide!important;} ' +
    '.watchlist-button{color:inherit;} ' +
    '.watchlist-button:before{content:"\\e064"!important;font-family:lucide!important;} ' +
    '.watchlist-button:hover{opacity:0.9;} ' +
    '.favorite-button{color:inherit;} ' +
    '.favorite-button.favorited{color: red;} ' +
    '.favorite-button:before{content:"\\e0f6";font-family:lucide!important;} ' +
    '.favorite-button.favorited:before{content:"\\e0f6";font-family:lucide!important;} ' +
    '.detailButton.detail-button{margin: 0!important;background: buttonface!important;color:inherit!important;} ' +
    '.detailButton.detail-button:before{content:"\\e0ff";font-family:lucide!important;} ' +
    '.arrow.right-arrow i{display:none;} ' +
    '.arrow.right-arrow:before{content:"\\e073";font-family:lucide!important;font-size: 50px;} ' +
    '.arrow.left-arrow i{display:none;} ' +
    '.arrow.left-arrow:before{content:"\\e072";font-family:lucide!important;font-size: 50px;} ' +
    '.material-icons:not(:empty) {font-family: "Material Icons" !important;} ';

function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * Fetches Lucide CSS from a remote URL and saves it to a local file.
 * @param {string} url - The URL to fetch the CSS from.
 * @param {string} localPath - The local path to save the CSS file.
 * @returns {Promise<string>} The content of the downloaded CSS.
 */
function fetchAndSaveCSS(url, localPath) {
    return new Promise((resolve, reject) => {
        console.log('🌐 Downloading Lucide CSS...');
        https
            .get(url, (res) => {
                if (res.statusCode !== 200) {
                    return reject(new Error(`Failed to download CSS: ${res.statusCode}`));
                }

                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    fs.writeFileSync(localPath, data, 'utf8');
                    console.log(`✅ Saved Lucide CSS to ${localPath}`);
                    resolve(data);
                });
            })
            .on('error', reject);
    });
}

/**
 * Fetches Lucide CSS from a remote URL or uses a local copy if available.
 * @returns {Promise<string>} The Lucide CSS content.
 */
async function getLucideCSS() {
    ensureDirectoryExists(LOCAL_CSS_DIR);

    if (fs.existsSync(LOCAL_CSS_PATH)) {
        console.log('📄 Using local Lucide CSS...');
        return fs.readFileSync(LOCAL_CSS_PATH, 'utf8');
    } else {
        return await fetchAndSaveCSS(LUCIDE_CSS_URL, LOCAL_CSS_PATH);
    }
}

/**
 * Parses Lucide CSS to extract icon names and their corresponding Unicode codes.
 * @param {string} css - The Lucide CSS content.
 * @returns {Object} A mapping of icon names to their Unicode codes.
 */
function parseLucideCSS(css) {
    const iconMap = {};
    const regex = /\.icon-([a-z0-9-]+)::before\s*{\s*content:\s*"\\(e[0-9a-f]{3,4})";\s*}/gi;

    let match;
    while ((match = regex.exec(css)) !== null) {
        const name = match[1];
        const code = match[2];
        iconMap[name] = code;
    }
    return iconMap;
}

/**
 * Generates the final CSS content based on the provided mapping and icon codes.
 * @param {Object} mapping - The mapping of icon names to Lucide names.
 * @param {Object} iconMap - The mapping of Lucide names to their Unicode codes.
 * @returns
 */
function generateCSS(mapping, iconMap) {
    let result = MAIN_CONTENT;

    for (const [key, lucideName] of Object.entries(mapping)) {
        const code = iconMap[lucideName];
        if (!code) {
            console.warn(`⚠️  Icon "${lucideName}" not found in Lucide CSS`);
            continue;
        }
        result += `.material-icons.${key}::before { content: "\\${code}"; }`;
    }
    return result;
}

(async () => {
    try {
        const jsonRaw = fs.readFileSync(inputPath, 'utf8');
        const iconMapping = JSON.parse(jsonRaw);

        const lucideCssData = await getLucideCSS();

        console.log('🔍 Parsing icon codes...');
        const iconCodeMap = parseLucideCSS(lucideCssData);

        console.log('🛠️ Generating output CSS...');
        const outputCSS = generateCSS(iconMapping, iconCodeMap);

        fs.writeFileSync(GENERATED_CSS_PATH, outputCSS, 'utf8');

        console.log(`✅ Done! CSS written to ${GENERATED_CSS_PATH}`);
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
})();
