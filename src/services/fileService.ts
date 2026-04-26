import fs from "fs/promises";
import { Stats } from "fs";
import path from "path";

export interface FileInfo {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  lastModified?: string;
}

export interface FileMeta {
  size: number;
  lastModified: string;
}

export class FileService {
  private readonly storageRoot: string;

  constructor(storageRoot: string) {
    this.storageRoot = storageRoot;
  }

  /** Преобразует URL-путь в абсолютный путь на диске, защищая от path traversal */
  resolvePath(urlPath: string): string {
    const normalized = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
    const resolved = path.join(this.storageRoot, normalized);

    if (!resolved.startsWith(this.storageRoot)) {
      throw new Error("Access denied: path traversal detected");
    }
    return resolved;
  }

  /** Сохраняет файл, создавая промежуточные директории */
  async saveFile(urlPath: string, data: Buffer): Promise<void> {
    const filePath = this.resolvePath(urlPath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
  }

  /** Копирует файл из источника в назначение */
  async copyFile(sourcePath: string, destPath: string): Promise<void> {
    const src = this.resolvePath(sourcePath);
    const dst = this.resolvePath(destPath);

    const srcStats = await fs.stat(src);
    if (!srcStats.isFile()) {
      throw new Error("Source is not a file");
    }

    await fs.mkdir(path.dirname(dst), { recursive: true });
    await fs.copyFile(src, dst);
  }

  /** Читает содержимое файла */
  async readFile(urlPath: string): Promise<Buffer> {
    const filePath = this.resolvePath(urlPath);
    return fs.readFile(filePath);
  }

  /** Получает метаинформацию о файле */
  async getFileMeta(urlPath: string): Promise<FileMeta> {
    const filePath = this.resolvePath(urlPath);
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      throw new Error("Not a file");
    }
    return {
      size: stats.size,
      lastModified: stats.mtime.toUTCString(),
    };
  }

  /** Получает список содержимого директории */
  async listDirectory(urlPath: string): Promise<FileInfo[]> {
    const dirPath = this.resolvePath(urlPath);
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    const items: FileInfo[] = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(dirPath, entry.name);
        let stats: Stats | undefined;

        try {
          stats = await fs.stat(entryPath);
        } catch {
          // ignore
        }

        const relativePath = path.join(urlPath, entry.name);

        if (entry.isDirectory()) {
          return {
            name: entry.name,
            path: relativePath,
            type: "directory" as const,
          };
        } else {
          return {
            name: entry.name,
            path: relativePath,
            type: "file" as const,
            size: stats?.size,
            lastModified: stats?.mtime.toUTCString(),
          };
        }
      }),
    );

    return items;
  }

  /** Удаляет файл или директорию рекурсивно */
  async delete(urlPath: string): Promise<void> {
    const targetPath = this.resolvePath(urlPath);
    const stats = await fs.stat(targetPath);

    if (stats.isDirectory()) {
      await fs.rm(targetPath, { recursive: true, force: true });
    } else {
      await fs.unlink(targetPath);
    }
  }

  /** Проверяет существование пути и возвращает его тип */
  async stat(
    urlPath: string,
  ): Promise<{ isFile: boolean; isDirectory: boolean } | null> {
    try {
      const filePath = this.resolvePath(urlPath);
      const stats = await fs.stat(filePath);
      return {
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
      };
    } catch {
      return null;
    }
  }
}
