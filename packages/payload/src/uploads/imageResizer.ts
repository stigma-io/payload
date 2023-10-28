import type { UploadedFile } from 'express-fileupload'
import type { OutputInfo } from 'sharp'

import { fromBuffer } from 'file-type'
import fs from 'fs'
import sanitize from 'sanitize-filename'
import sharp from 'sharp'

import type { UploadEdits } from '../admin/components/views/collections/Edit/types'
import type { SanitizedCollectionConfig } from '../collections/config/types'
import type { PayloadRequest } from '../express/types'
import type { FileSize, FileSizes, FileToSave, ImageSize, ProbedImageSize } from './types'

import { isNumber } from '../utilities/isNumber'
import fileExists from './fileExists'

type ResizeArgs = {
  config: SanitizedCollectionConfig
  dimensions: ProbedImageSize
  file: UploadedFile
  mimeType: string
  req: PayloadRequest & {
    query?: {
      uploadEdits?: UploadEdits
    }
  }
  savedFilename: string
  staticPath: string
}

/** Result from resizing and transforming the requested image sizes */
type ImageSizesResult = {
  sizeData: FileSizes
  sizesToSave: FileToSave[]
}

type SanitizedImageData = {
  ext: string
  name: string
}

/**
 * Sanitize the image name and extract the extension from the source image
 *
 * @param sourceImage - the source image
 * @returns the sanitized name and extension
 */
const getSanitizedImageData = (sourceImage: string): SanitizedImageData => {
  const extension = sourceImage.split('.').pop()
  const name = sanitize(sourceImage.substring(0, sourceImage.lastIndexOf('.')) || sourceImage)
  return { name, ext: extension }
}

/**
 * Create a new image name based on the output image name, the dimensions and
 * the extension.
 *
 * Ignore the fact that duplicate names could happen if the there is one
 * size with `width AND height` and one with only `height OR width`. Because
 * space is expensive, we will reuse the same image for both sizes.
 *
 * @param outputImageName - the sanitized image name
 * @param bufferInfo - the buffer info
 * @param extension - the extension to use
 * @returns the new image name that is not taken
 */
const createImageName = (
  outputImageName: string,
  { height, width }: OutputInfo,
  extension: string,
) => `${outputImageName}-${width}x${height}.${extension}`

/**
 * Create the result object for the image resize operation based on the
 * provided parameters. If the name is not provided, an empty result object
 * is returned.
 *
 * @param name - the name of the image
 * @param filename - the filename of the image
 * @param width - the width of the image
 * @param height - the height of the image
 * @param filesize - the filesize of the image
 * @param mimeType - the mime type of the image
 * @param sizesToSave - the sizes to save
 * @returns the result object
 */
const createResult = (
  name: string,
  filename: FileSize['filename'] = null,
  width: FileSize['width'] = null,
  height: FileSize['height'] = null,
  filesize: FileSize['filesize'] = null,
  mimeType: FileSize['mimeType'] = null,
  sizesToSave: FileToSave[] = [],
): ImageSizesResult => ({
  sizeData: {
    [name]: {
      filename,
      filesize,
      height,
      mimeType,
      width,
    },
  },
  sizesToSave,
})

/**
 * Check if the image needs to be resized according to the requested dimensions
 * and the original image size. If the resize options withoutEnlargement or withoutReduction are provided,
 * the image will be resized regardless of the requested dimensions, given that the
 * width or height to be resized is provided.
 *
 * @param resizeConfig - object containing the requested dimensions and resize options
 * @param original - the original image size
 * @returns true if the image needs to be resized, false otherwise
 */
const needsResize = (
  { height: desiredHeight, width: desiredWidth, withoutEnlargement, withoutReduction }: ImageSize,
  original: ProbedImageSize,
): boolean => {
  // allow enlargement or prevent reduction (our default is to prevent
  // enlargement and allow reduction)
  if (withoutEnlargement !== undefined || withoutReduction !== undefined) {
    return true // needs resize
  }

  const isWidthOrHeightNotDefined = !desiredHeight || !desiredWidth

  if (isWidthOrHeightNotDefined) {
    // If with and height are not defined, it means there is a format conversion
    // and the image needs to be "resized" (transformed).
    return true // needs resize
  }

  const hasInsufficientWidth = original.width < desiredWidth
  const hasInsufficientHeight = original.height < desiredHeight
  if (hasInsufficientWidth && hasInsufficientHeight) {
    // doesn't need resize - prevent enlargement. This should only happen if both width and height are insufficient.
    // if only one dimension is insufficient and the other is sufficient, resizing needs to happen, as the image
    // should be resized to the sufficient dimension.
    return false
  }

  return true // needs resize
}

/**
 * For the provided image sizes, handle the resizing and the transforms
 * (format, trim, etc.) of each requested image size and return the result object.
 * This only handles the image sizes. The transforms of the original image
 * are handled in {@link ./generateFileData.ts}.
 *
 * The image will be resized according to the provided
 * resize config. If no image sizes are requested, the resolved data will be empty.
 * For every image that dos not need to be resized, an result object with `null`
 * parameters will be returned.
 *
 * @param resizeConfig - the resize config
 * @returns the result of the resize operation(s)
 */
export default async function resizeAndTransformImageSizes({
  config,
  dimensions,
  file,
  mimeType,
  req,
  savedFilename,
  staticPath,
}: ResizeArgs): Promise<ImageSizesResult> {
  const { imageSizes } = config.upload
  // Noting to resize here so return as early as possible
  if (!imageSizes) return { sizeData: {}, sizesToSave: [] }

  const sharpBase = sharp(file.tempFilePath || file.data).rotate() // pass rotate() to auto-rotate based on EXIF data. https://github.com/payloadcms/payload/pull/3081

  const results: ImageSizesResult[] = await Promise.all(
    imageSizes.map(async (imageResizeConfig): Promise<ImageSizesResult> => {
      // This checks if a resize should happen. If not, the resized image will be
      // skipped COMPLETELY and thus will not be included in the resulting images.
      // All further format/trim options will thus be skipped as well.
      if (!needsResize(imageResizeConfig, dimensions)) {
        return createResult(imageResizeConfig.name)
      }
      let resized = sharpBase.clone()

      const hasEdits = req.query?.uploadEdits

      if (hasEdits && imageResizeConfig.width && imageResizeConfig.height) {
        const { height, width } = imageResizeConfig

        const targetAspectRatio = width / height
        const originalAspectRatio = dimensions.width / dimensions.height

        if (originalAspectRatio === targetAspectRatio) {
          resized = resized.resize(imageResizeConfig)
        } else {
          const focalPoint = {
            x: 0.5,
            y: 0.5,
          }

          if (req.query.uploadEdits?.focalPoint) {
            if (isNumber(req.query.uploadEdits.focalPoint?.x)) {
              focalPoint.x = req.query.uploadEdits.focalPoint.x
            }
            if (isNumber(req.query.uploadEdits.focalPoint?.y)) {
              focalPoint.y = req.query.uploadEdits.focalPoint.y
            }
          }

          const prioritizeHeight = originalAspectRatio > targetAspectRatio

          const { info } = await resized
            .resize({
              height: prioritizeHeight ? height : null,
              width: prioritizeHeight ? null : width,
            })
            .toBuffer({ resolveWithObject: true })

          const maxOffsetX = Math.max(info.width - width, 0)
          const maxOffsetY = Math.max(info.height - height, 0)

          const focalPointX = Math.floor((info.width / 100) * focalPoint.x)
          const focalPointY = Math.floor((info.height / 100) * focalPoint.y)

          const offsetX = Math.min(Math.max(focalPointX - width / 2, 0), maxOffsetX)
          const offsetY = Math.min(Math.max(focalPointY - height / 2, 0), maxOffsetY)

          resized = resized.extract({
            height,
            left: offsetX,
            top: offsetY,
            width,
          })
        }
      } else {
        resized = resized.resize(imageResizeConfig)
      }

      if (imageResizeConfig.formatOptions) {
        resized = resized.toFormat(
          imageResizeConfig.formatOptions.format,
          imageResizeConfig.formatOptions.options,
        )
      }

      if (imageResizeConfig.trimOptions) {
        resized = resized.trim(imageResizeConfig.trimOptions)
      }

      const { data: bufferData, info: bufferInfo } = await resized.toBuffer({
        resolveWithObject: true,
      })

      const sanitizedImage = getSanitizedImageData(savedFilename)

      if (req.payloadUploadSizes) {
        req.payloadUploadSizes[imageResizeConfig.name] = bufferData
      }

      const mimeInfo = await fromBuffer(bufferData)

      const imageNameWithDimensions = createImageName(
        sanitizedImage.name,
        bufferInfo,
        mimeInfo?.ext || sanitizedImage.ext,
      )

      const imagePath = `${staticPath}/${imageNameWithDimensions}`

      if (await fileExists(imagePath)) {
        try {
          fs.unlinkSync(imagePath)
        } catch {
          // Ignore unlink errors
        }
      }

      const { height, size, width } = bufferInfo
      return createResult(
        imageResizeConfig.name,
        imageNameWithDimensions,
        width,
        height,
        size,
        mimeInfo?.mime || mimeType,
        [{ buffer: bufferData, path: imagePath }],
      )
    }),
  )

  return results.reduce(
    (acc, result) => {
      Object.assign(acc.sizeData, result.sizeData)
      acc.sizesToSave.push(...result.sizesToSave)
      return acc
    },
    { sizeData: {}, sizesToSave: [] },
  )
}
