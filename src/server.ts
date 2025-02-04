import Fastify, { FastifyReply, FastifyRequest } from 'fastify'
import fastifyMultipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import fastifyCors from '@fastify/cors'
import { createCanvas, loadImage } from 'canvas'
import path from 'path'

const app = Fastify({
  logger: true,
  bodyLimit: 100 * 1024 * 1024, // 10MB limit for the entire request
})

app.register(fastifyCors, {
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
})

// Configure multipart with limits
app.register(fastifyMultipart, {
  limits: {
    fieldSize: 100 * 1024 * 1024, // 10MB limit for each field
    fileSize: 100 * 1024 * 1024, // 10MB limit for each file
    files: 1, // Allow only 1 file upload at a time
    fields: 1, // Limit number of non-file fields
  },
})

app.register(fastifyStatic, {
  root: path.join(__dirname, '../public'),
  prefix: '/',
})

app.post('/upload', async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const data = await req.file()
    if (!data) {
      return reply.status(400).send({ error: 'No image uploaded' })
    }

    // Log file information
    req.log.info(
      {
        filename: data.filename,
        mimetype: data.mimetype,
        size: data.file.bytesRead,
      },
      'Processing file'
    )

    const buffer = await data.toBuffer()
    const image = await loadImage(buffer)

    // Create canvas with original image dimensions
    const canvas = createCanvas(image.width, image.height)
    const ctx = canvas.getContext('2d')

    // Draw image to canvas
    ctx.drawImage(image, 0, 0)

    // Get the raw pixel data from the canvas
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    // Return the canvas data with dimensions
    return reply.send({
      width: canvas.width,
      height: canvas.height,
      pixels: Array.from(imageData.data),
    })
  } catch (error) {
    req.log.error(error, 'Error processing file')

    // More specific error handling
    if ((error as any).code === 'FST_REQ_FILE_TOO_LARGE') {
      return reply.status(413).send({
        error: 'File too large',
        maxSize: '100MB',
      })
    }

    return reply.status(500).send({ error: 'Internal Server Error' })
  }
})

app.get('/', async (req: FastifyRequest, reply: FastifyReply) => {
  return reply.sendFile('index.html')
})

const port = Number(process.env.PORT) || 3001

interface ServerOptions {
  port: number;
  host: string;
}

const serverOptions: ServerOptions = {
  port,
  host: '0.0.0.0',
};

app.listen(serverOptions, (err: Error | null, address: string) => {
  if (err) {
    
    app.log.error(err);
    process.exit(1);

  }
  console.log(`Server running on ${port}, http://localhost:${port}`);
});
