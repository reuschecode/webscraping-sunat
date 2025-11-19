import puppeteer, { Browser } from "puppeteer";
import { SunatData } from "../models";

const sunatUrl = "https://e-consultaruc.sunat.gob.pe";

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    console.log("💻 - creating browser...");
    browserPromise = puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: puppeteer.executablePath("chrome"),
    });
  }
  return browserPromise;
}

export async function scrapeSunatByRuc(ruc: string): Promise<SunatData> {
  const url = `${sunatUrl}/cl-ti-itmrconsruc/FrameCriterioBusquedaWeb.jsp`;

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setUserAgent({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    });
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    let alertMessage: string | null = null;

    page.on("dialog", async (dialog) => {
      alertMessage = dialog.message();
      await dialog.dismiss();
    });

    const rucBtnSearch = "#btnAceptar";
    const rucInputRuc = "#txtRuc";
    await page.waitForSelector(rucBtnSearch);
    await page.type(rucInputRuc, ruc);
    await page.click(rucBtnSearch);
    if (alertMessage) {
      return { ruc };
    }
    await page.waitForSelector(".list-group", { timeout: 5000 });

    const scraped: SunatData = await page.evaluate(() => {
      const cleanText = (text: string) => text.replace(/\s+/g, " ").trim();

      const scrapedHeading = Array.from(
        document.querySelectorAll(".list-group-item-heading")
      ).map((el) => el.innerHTML);

      const scrapedText = Array.from(
        document.querySelectorAll(".list-group-item-text")
      ).map((el) => el.innerHTML);

      const economicActivities = (() => {
        const heading = Array.from(
          document.querySelectorAll(".list-group-item-heading")
        ).find((h) => h.innerHTML.includes("Actividad(es) Económica(s):"));

        if (!heading) return [];

        const row = heading.closest(".list-group-item");
        if (!row) return [];

        const table = row.querySelector(".tblResultado");
        if (!table) return [];

        return Array.from(table.querySelectorAll("tbody tr td")).map((td) =>
          td.innerHTML.replace(/\s+/g, " ").trim()
        );
      })();

      return {
        businessName: cleanText(scrapedHeading[1].split("-")[1]),
        tradeName: cleanText(scrapedText[1]),
        taxpayerType: cleanText(scrapedText[0]),
        taxpayerCondition: cleanText(scrapedText[5]),
        taxpayerStatus: cleanText(scrapedText[4]),
        fiscalAddress: cleanText(scrapedText[6]),
        economicActivities,
      };
    });

    return { ruc, ...scraped };
  } finally {
    await page.close();
  }
}
