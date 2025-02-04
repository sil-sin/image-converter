"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const static_1 = __importDefault(require("@fastify/static"));
const cors_1 = __importDefault(require("@fastify/cors"));
const canvas_1 = require("canvas");
const path_1 = __importDefault(require("path"));
const app = (0, fastify_1.default)({
    logger: true,
    bodyLimit: 100 * 1024 * 1024, // 10MB limit for the entire request
});
app.register(cors_1.default, {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
});
// Configure multipart with limits
app.register(multipart_1.default, {
    limits: {
        fieldSize: 100 * 1024 * 1024, // 10MB limit for each field
        fileSize: 100 * 1024 * 1024, // 10MB limit for each file
        files: 1, // Allow only 1 file upload at a time
        fields: 1, // Limit number of non-file fields
    },
});
app.register(static_1.default, {
    root: path_1.default.join(__dirname, 'public'),
    prefix: '/',
});
app.post('/upload', async (req, reply) => {
    try {
        const data = await req.file();
        if (!data) {
            return reply.status(400).send({ error: 'No image uploaded' });
        }
        // Log file information
        req.log.info({
            filename: data.filename,
            mimetype: data.mimetype,
            size: data.file.bytesRead,
        }, 'Processing file');
        const buffer = await data.toBuffer();
        const image = await (0, canvas_1.loadImage)(buffer);
        // Create canvas with original image dimensions
        const canvas = (0, canvas_1.createCanvas)(image.width, image.height);
        const ctx = canvas.getContext('2d');
        // Draw image to canvas
        ctx.drawImage(image, 0, 0);
        // Get the raw pixel data from the canvas
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // Return the canvas data with dimensions
        return reply.send({
            width: canvas.width,
            height: canvas.height,
            pixels: Array.from(imageData.data),
        });
    }
    catch (error) {
        req.log.error(error, 'Error processing file');
        // More specific error handling
        if (error.code === 'FST_REQ_FILE_TOO_LARGE') {
            return reply.status(413).send({
                error: 'File too large',
                maxSize: '100MB',
            });
        }
        return reply.status(500).send({ error: 'Internal Server Error' });
    }
});
app.get('/', async (req, reply) => {
    return reply.sendFile('index.html');
});
const port = Number(process.env.PORT) || 3001;
const serverOptions = {
    port,
    host: '0.0.0.0',
};
app.listen(serverOptions, (err, address) => {
    if (err) {
        app.log.error(err);
        process.exit(1);
    }
    console.log(`Server running on ${port}, http://localhost:${port}`);
});
