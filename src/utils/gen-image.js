const generateImageFromHTML = async (htmlString, outputFilePath) => {
    let browser;

    if (process.env.IS_MAC_M1) {
         browser = await require("puppeteer-core").launch({
            executablePath: '/Applications/Chromium.app/Contents/MacOS/Chromium',
            headless: false
        });
    } else {
        browser = await require("puppeteer").launch();
    }

    const page = await browser.newPage();
    
    // Set the content of the page to your HTML string
    await page.setContent(htmlString);
  
    // Adjust the viewport and screenshot options as needed
    await page.setViewport({ width: 1280, height: 720 });
    await page.screenshot({ path: outputFilePath });
  
    await browser.close();
}

module.exports = generateImageFromHTML;
