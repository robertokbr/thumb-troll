const puppeteer = require("puppeteer-core");

const generateImageFromHTML = async (htmlString, outputFilePath) => {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Chromium.app/Contents/MacOS/Chromium',
        headless: false
    });

    const page = await browser.newPage();
    
    // Set the content of the page to your HTML string
    await page.setContent(htmlString);
  
    // Adjust the viewport and screenshot options as needed
    await page.setViewport({ width: 1280, height: 720 });
    await page.screenshot({ path: outputFilePath });
  
    await browser.close();
}

module.exports = generateImageFromHTML;
