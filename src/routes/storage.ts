import { Router, Request, Response } from "express";
import mime from "mime-types";
import { FileService } from "../services/fileService";

export function createStorageRouter(fileService: FileService): Router {
  const router = Router();

  /**
   * PUT /*
   * Загрузка файла. Если передан X-Copy-From — копирование.
   */
  router.put("/*", async (req: Request, res: Response) => {
    const urlPath = `/${req.params[0]}`;

    if (!req.params[0] || req.params[0].endsWith("/")) {
      res.status(400).json({ error: "File path must not end with '/'" });
      return;
    }

    const copyFrom = req.headers["x-copy-from"] as string | undefined;

    // --- Режим копирования ---
    if (copyFrom) {
      try {
        await fileService.copyFile(copyFrom, urlPath);
        res
          .status(201)
          .json({ message: "File copied successfully", destination: urlPath });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        if (message.includes("no such file")) {
          res.status(404).json({ error: "Source file not found" });
        } else if (message.includes("Access denied")) {
          res.status(403).json({ error: message });
        } else {
          res.status(500).json({ error: message });
        }
      }
      return;
    }

    // --- Режим загрузки ---
    try {
      // req.body — это Buffer благодаря express.raw() в server.ts
      const data = req.body as Buffer;
      await fileService.saveFile(urlPath, data);
      res
        .status(201)
        .json({ message: "File uploaded successfully", path: urlPath });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message.includes("Access denied")) {
        res.status(403).json({ error: message });
      } else {
        res.status(500).json({ error: message });
      }
    }
  });

  /**
   * GET /*
   * Файл → отдаёт содержимое.
   * Директория → JSON со списком файлов.
   */
  router.get("/*", async (req: Request, res: Response) => {
    const urlPath = `/${req.params[0]}`;

    try {
      const stat = await fileService.stat(urlPath);

      if (!stat) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      if (stat.isDirectory) {
        const items = await fileService.listDirectory(urlPath);
        res.status(200).json(items);
        return;
      }

      if (stat.isFile) {
        const data = await fileService.readFile(urlPath);
        const mimeType = mime.lookup(urlPath) || "application/octet-stream";
        res
          .status(200)
          .header("Content-Type", mimeType)
          .header("Content-Length", String(data.length))
          .send(data);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message.includes("Access denied")) {
        res.status(403).json({ error: message });
      } else {
        res.status(500).json({ error: message });
      }
    }
  });

  /**
   * HEAD /*
   * Возвращает только заголовки: размер и дату изменения.
   */
  router.head("/*", async (req: Request, res: Response) => {
    const urlPath = `/${req.params[0]}`;

    try {
      const meta = await fileService.getFileMeta(urlPath);
      const mimeType = mime.lookup(urlPath) || "application/octet-stream";

      res
        .status(200)
        .header("Content-Type", mimeType)
        .header("Content-Length", String(meta.size))
        .header("Last-Modified", meta.lastModified)
        .end();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message.includes("no such file") || message.includes("Not a file")) {
        res.status(404).end();
      } else if (message.includes("Access denied")) {
        res.status(403).end();
      } else {
        res.status(500).end();
      }
    }
  });

  /**
   * DELETE /*
   * Удаляет файл или директорию рекурсивно.
   */
  router.delete("/*", async (req: Request, res: Response) => {
    const urlPath = `/${req.params[0]}`;

    try {
      const stat = await fileService.stat(urlPath);

      if (!stat) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      await fileService.delete(urlPath);
      res.status(200).json({ message: "Deleted successfully", path: urlPath });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message.includes("Access denied")) {
        res.status(403).json({ error: message });
      } else {
        res.status(500).json({ error: message });
      }
    }
  });

  return router;
}
