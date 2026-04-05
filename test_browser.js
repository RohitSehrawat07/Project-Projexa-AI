const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    // Visit index page
    await page.goto("http://localhost:5000/index.html");
    
    console.log("On index page. Testing Login with non-existent user...");
    // Try to login with "Ghost"
    await page.type('#loginInput', 'Ghost');
    await page.click('#loginBtn');
    
    // Wait a bit to let API process and redirect
    await page.waitForTimeout(2000);
    
    console.log("Current URL after login:", page.url());
    
    // Check if we are on dashboard
    if (page.url().includes("dashboard.html")) {
        console.log("BUG: The system created and logged in 'Ghost' from the LOGIN tab! It shouldn't auto-create.");
    } else {
        console.log("Good! Login rejected the new user.");
    }
    
    await browser.close();
})();
