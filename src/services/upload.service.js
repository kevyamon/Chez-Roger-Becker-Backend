/**
 * Service de téléversement d'images sur Cloudinary (UploadService).
 * Traite le flux binaire en mémoire et optimise le format et la qualité.
 */

const { Readable } = require('stream');
const cloudinary = require('../config/cloudinary');

class UploadService {
  /**
   * Téléverse une image en buffer mémoire vers Cloudinary.
   * @param {Buffer} buffer - Données binaires du fichier.
   * @param {string} [folder='chez_roger_becker/dishes'] - Dossier Cloudinary de destination.
   * @returns {Promise<{ url: string, publicId: string }>}
   */
  async uploadImageFromBuffer(buffer, folder = 'chez_roger_becker/dishes') {
    if (!buffer) {
      const error = new Error('Aucun fichier image fourni.');
      error.statusCode = 400;
      throw error;
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { quality: 'auto', fetch_format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) {
            const uploadErr = new Error(`Échec du téléversement Cloudinary : ${error.message}`);
            uploadErr.statusCode = 502;
            return reject(uploadErr);
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format
          });
        }
      );

      // Création du flux de lecture natif Node.js
      const stream = Readable.from(buffer);
      stream.pipe(uploadStream);
    });
  }
}

module.exports = new UploadService();
