import express from "express";
import path from "path";
import fs from "fs/promises";
import { FileService } from "./services/fileService";
import { createStorageRouter } from "./routes/storage";

const PORT = parseInt(process.env.PORT || "3000", 10);
const STORAGE_ROOT = path.resolve(process.env.STORAGE_ROOT || "./storage");

async function bootstrap(): Promise<void> {
  // Создаём корневую папку хранилища если не существует
  await fs.mkdir(STORAGE_ROOT, { recursive: true });

  const app = express();

  // Читаем тело запроса как сырые байты (Buffer) для любого Content-Type.
  // Это нужно чтобы PUT корректно принимал бинарные файлы (картинки, pdf и т.д.)
  app.use(express.raw({ type: "*/*", limit: "100mb" }));

  const fileService = new FileService(STORAGE_ROOT);
  const storageRouter = createStorageRouter(fileService);

  // Все маршруты хранилища монтируем в корень
  app.use("/", storageRouter);

  // Глобальный обработчик ошибок
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(err.stack);
      res.status(500).json({ error: "Internal server error" });
    },
  );

  app.listen(PORT, () => {
    console.log(
      `\n🗄️  File Storage Server running at http://localhost:${PORT}`,
    );
    console.log(`📁  Storage root: ${STORAGE_ROOT}\n`);
  });
}

bootstrap();
