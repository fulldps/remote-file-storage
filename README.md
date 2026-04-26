# File Storage

Удалённое файловое хранилище с REST API. URL-путь запроса напрямую отражает структуру файлов:

```
GET http://localhost:3000/documents/report.pdf
                          └── /storage/documents/report.pdf на диске
```

## Запуск

```bash
npm install
npm run dev
```

Сервер запускается на `http://localhost:3000`, файлы хранятся в папке `./storage`.

## Использование

**Загрузить файл**

```bash
curl -X PUT http://localhost:3000/docs/hello.txt --data-binary @hello.txt
```

**Скопировать файл**

```bash
curl -X PUT http://localhost:3000/backup/hello.txt -H "X-Copy-From: /docs/hello.txt"
```

**Получить файл**

```bash
curl http://localhost:3000/docs/hello.txt
```

**Список содержимого директории**

```bash
curl http://localhost:3000/docs/
```

**Метаинформация о файле** (размер, дата изменения — только заголовки, без тела)

```bash
curl -I http://localhost:3000/docs/hello.txt
```

**Удалить файл или директорию**

```bash
curl -X DELETE http://localhost:3000/docs/hello.txt
```

GET-запросы к файлам и директориям также работают напрямую в браузере.
