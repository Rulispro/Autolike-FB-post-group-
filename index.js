const puppeteer = require("puppeteer");
const fs = require("fs");
const XLSX = require("xlsx");

// === Load Excel Template ===
const workbook = XLSX.readFile("template.xlsx");
const sheet = workbook.Sheets["Tasks"];
const tasks = XLSX.utils.sheet_to_json(sheet);

// === Helper delay ===
const delay = ms => new Promise(res => setTimeout(res, ms));

(async () => {
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0]; // format YYYY-MM-DD

  // Filter task sesuai tanggal hari ini
  const todayTasks = tasks.filter(t => t.Date === dateStr);

  for (const task of todayTasks) {
    const { Account, GroupURL, TotalLikes } = task;

    // Ambil cookies dari Secrets
    const cookiesStr = process.env[`COOKIE_${Account.toUpperCase()}`];
    if (!cookiesStr) {
      console.log(`❌ Cookies untuk ${Account} tidak ditemukan`);
      continue;
    }
    const cookies = JSON.parse(cookiesStr);

    console.log(`\n🚀 Jalankan akun ${Account} di grup ${GroupURL}`);

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();

    // Samakan environment dengan mobile
    await page.setUserAgent(
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/95.0.4638.74 Mobile Safari/537.36"
    );
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    await page.setCookie(...cookies);

    // Masuk ke grup
    await page.goto(GroupURL, { waitUntil: "networkidle2" });

    let clicked = 0;
    while (clicked < TotalLikes) {
      const button = await page.$(
        'div[role="button"][aria-label*="Like"], div[role="button"][aria-label*="Suka"]'
      );
      if (button) {
        await button.tap();
        clicked++;
        console.log(`👍 ${Account} klik tombol Like ke-${clicked}`);
      } else {
        console.log("🔄 Tidak ada tombol Like, scroll...");
      }
      await page.evaluate(() => window.scrollBy(0, 500));
      await delay(3000);
    }

    console.log(`🎉 ${Account} selesai Like ${clicked} postingan`);
    await browser.close();

    // Jeda 3 detik sebelum pindah akun berikutnya
    await delay(3000);
  }

  console.log("\n✅ Semua akun selesai");
})();
