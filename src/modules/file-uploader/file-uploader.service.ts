import multer, { StorageEngine } from 'multer'
import path from 'path'
import fs from 'fs'
import { Request, Response, NextFunction } from 'express'
import AppError from '../error-handler/utils/app-error'
import { promisify } from 'util'

const baseUploadDir = process.env.BASE_UPLOAD_DIR || 'uploads'

export class FileUploaderService {
  private uploadDir: string
  private fileSizeLimit: number
  private allowedFileTypes: RegExp
  private storage: StorageEngine

  constructor(
    uploadDir: string = baseUploadDir,
    fileSizeLimit: number = 1024 * 1024 * 5,
    allowedFileTypes: RegExp = /jpeg|jpg|png|gif/
  ) {
    this.uploadDir = path.join('.', `${uploadDir}/`)
    this.fileSizeLimit = fileSizeLimit
    this.allowedFileTypes = allowedFileTypes

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true })
    }

    this.storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.uploadDir)
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
        cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`)
      },
    })
  }

  private fileFilter = (req: any, file: any, cb: any) => {
    const extName = this.allowedFileTypes.test(
      path.extname(file.originalname).toLowerCase()
    )
    const mimeType = this.allowedFileTypes.test(file.mimetype)

    if (mimeType && extName) {
      cb(null, true)
    } else {
      cb(new AppError('Invalid file type', 400))
    }
  }

  public getUploader() {
    return multer({
      storage: this.storage,
      fileFilter: this.fileFilter,
      limits: { fileSize: this.fileSizeLimit },
    })
  }

  public handleSingleUpload(fieldName: string, oldFilePath?: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const upload = this.getUploader().single(fieldName)
      upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
          return next(err)
        } else if (err) {
          return next(err)
        }

        if (oldFilePath) {
          const filePath = path.join(oldFilePath)
          try {
            const stats = await promisify(fs.stat)(filePath)
            if (stats) {
              await promisify(fs.unlink)(filePath)
            }
          } catch (err) {}
        }

        next()
      })
    }
  }

  public handleMultipleUpload(fieldName: string, maxCount: number) {
    return (req: Request, res: Response, next: NextFunction) => {
      const upload = this.getUploader().array(fieldName, maxCount)
      upload(req, res, (err) => {
        if (err instanceof multer.MulterError) return next(err)
        else if (err) return next(err)
        next()
      })
    }
  }

  public handleDeleteSingleFile(oldFilePath: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      ;(async () => {
        const filePath = path.join(oldFilePath)
        try {
          const stats = await promisify(fs.stat)(filePath)
          if (stats) {
            await promisify(fs.unlink)(filePath)
          }
        } catch (err) {}

        next()
      })()
    }
  }
}

const imageUploaderService = new FileUploaderService(
  `${baseUploadDir}/images`,
  1024 * 1024 * 15,
  /jpeg|jpg|png|gif|webp|svg|bmp|tiff|heif|heic|ico|jfif|raw|cr2|nef|orf|sr2|arw|dng|pef|raf|rw2|psd|ai|eps|xcf|jxr|wdp|hdp|jp2|j2k|jpf|jpx|jpm|mj2|avif/
)

const videoUploaderService = new FileUploaderService(
  `${baseUploadDir}/videos`,
  1024 * 1024 * 100,
  /mp4|avi|mov|mkv|flv|wmv|webm|mpg|mpeg|3gp|m4v|ts|rm|rmvb|vob|ogv|dv|qt|asf|m2ts|mts|divx|f4v|swf|mxf|roq|nsv|mvb|svi|mpe|m2v|mp2|mpv|h264|h265|hevc/
)

const documentUploaderService = new FileUploaderService(
  `${baseUploadDir}/documents`,
  1024 * 1024 * 50,
  /pdf|doc|docx|xls|xlsx|ppt|pptx|odt|ods|odg|odp|txt|rtf|csv|epub|md|tex|pages|numbers|key|xml|json|yaml|yml|ini|cfg|conf|log|html|htm|xhtml|djvu|mobi|azw|azw3|fb2|lit|ps|wpd|wps|dot|dotx|xlt|xltx|pot|potx|oft|one|onetoc2|opf|oxps|hwp/
)
const fileUploaderService = new FileUploaderService(
  `${baseUploadDir}/`,
  1024 * 1024 * 1024,
  /.*/
)

export {
  imageUploaderService,
  documentUploaderService,
  videoUploaderService,
  fileUploaderService,
}
