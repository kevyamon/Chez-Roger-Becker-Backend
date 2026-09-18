/**
 * Middleware Multer pour la réception d'images en mémoire avant téléversement.
 * Valide le type MIME et limite la taille du fichier (max 5 Mo).
 */

const multer = require('multer');

// Stockage en mémoire RAM pour traitement direct en flux
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/jpg'];
  if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    const error = new Error('Format de fichier non pris en charge. Veuillez sélectionner une image (JPG, PNG, WEBP).');
    error.statusCode = 400;
    cb(error, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 Mo maximum
  }
});

module.exports = {
  uploadImageMiddleware: upload.single('image')
};
