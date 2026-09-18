/**
 * Configuration du SDK Cloudinary pour le téléversement d'images.
 */

const cloudinary = require('cloudinary').v2;
const environment = require('./environment');

cloudinary.config({
  cloud_name: environment.CLOUDINARY_CLOUD_NAME,
  api_key: environment.CLOUDINARY_API_KEY,
  api_secret: environment.CLOUDINARY_API_SECRET,
  secure: true
});

module.exports = cloudinary;
