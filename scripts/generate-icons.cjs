const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');

async function generateIcons() {
  console.log('Generating PattaMap icons...\n');

  try {
    // Generate logo192.png from logo.svg
    console.log('Creating logo192.png...');
    await sharp(path.join(publicDir, 'logo.svg'))
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'logo192.png'));
    console.log('  logo192.png created');

    // Generate logo512.png from logo.svg
    console.log('Creating logo512.png...');
    await sharp(path.join(publicDir, 'logo.svg'))
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'logo512.png'));
    console.log('  logo512.png created');

    // Generate favicon sizes from favicon.svg
    const faviconSizes = [16, 32, 48, 64];
    const faviconPngs = [];

    console.log('Creating favicon PNGs...');
    for (const size of faviconSizes) {
      const outputPath = path.join(publicDir, `favicon-${size}.png`);
      await sharp(path.join(publicDir, 'favicon.svg'))
        .resize(size, size)
        .png()
        .toFile(outputPath);
      faviconPngs.push(outputPath);
      console.log(`  favicon-${size}.png created`);
    }

    // Generate favicon.ico from the PNG files
    console.log('Creating favicon.ico...');
    const pngBuffers = faviconPngs.map(p => fs.readFileSync(p));
    const icoBuffer = await toIco(pngBuffers);
    fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
    console.log('  favicon.ico created');

    // Clean up temporary favicon PNGs
    console.log('Cleaning up temporary files...');
    for (const pngPath of faviconPngs) {
      fs.unlinkSync(pngPath);
      console.log(`  Deleted ${path.basename(pngPath)}`);
    }

    console.log('\nAll icons generated successfully!');
    console.log('\nGenerated files:');
    console.log('  - public/logo192.png (192x192)');
    console.log('  - public/logo512.png (512x512)');
    console.log('  - public/favicon.ico (16, 32, 48, 64)');

  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
