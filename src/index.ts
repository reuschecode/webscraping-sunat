import express, { Request, Response } from "express";
import { scrapeSunatByRuc } from "./services";
import { isValidRuc } from "./config/utils";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/api/sunat/validate-ruc/:ruc", async (req: Request, res: Response) => {
  const { ruc } = req.params;

  if (!isValidRuc(ruc)) {
    return res.status(400).json({
      error: "RUC inválido. Debe ser un número de 11 dígitos.",
      isValid: false,
      message: "RUC debe tener 11 dígitos.",
    });
  }

  try {
    const data = await scrapeSunatByRuc(ruc);
    if (!data.businessName && !data.tradeName) {
      return res.status(404).json({
        error: "No se encontraron datos para el RUC proporcionado.",
        isValid: false,
        message: "RUC no encontrado en la base de datos.",
      });
    }

    return res.json({ isValid: true, ...data });
  } catch (error: any) {
    console.error("Error haciendo scraping:", error?.message || error);

    return res.status(500).json({
      error: "Ocurrió un error al consultar la información.",
      isValid: false,
      message: "RUC no encontrado en la base de datos.",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
