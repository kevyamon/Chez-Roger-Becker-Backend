/**
 * Controleur d'authentification (AuthController).
 * Orchestre les requetes de connexion, deconnexion et profil sans logique metier directe.
 */

const authService = require('../services/auth.service');
const { sendSuccess } = require('../utils/responseHelper');
const env = require('../config/environment');

class AuthController {
  async login(req, res, next) {
    try {
      const { identifier, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;

      const result = await authService.login({ identifier, password, ipAddress });

      // Envoi du refresh token en cookie httpOnly securise
      res.cookie('refreshToken', result.refreshToken, env.cookieOptions);
      res.cookie('accessToken', result.accessToken, {
        ...env.cookieOptions,
        maxAge: 15 * 60 * 1000 // 15 minutes
      });

      return sendSuccess(
        res,
        {
          user: result.user,
          accessToken: result.accessToken
        },
        'Connexion reussie avec succes'
      );
    } catch (error) {
      next(error);
    }
  }

  async registerAdmin(req, res, next) {
    try {
      const { name, email, phone, password, privateKey } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;

      const result = await authService.registerAdmin({
        name,
        email,
        phone,
        password,
        privateKey,
        ipAddress
      });

      res.cookie('refreshToken', result.refreshToken, env.cookieOptions);
      res.cookie('accessToken', result.accessToken, {
        ...env.cookieOptions,
        maxAge: 15 * 60 * 1000 // 15 minutes
      });

      return sendSuccess(
        res,
        {
          user: result.user,
          accessToken: result.accessToken
        },
        'Compte administrateur créé avec succès',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const token = req.cookies?.refreshToken || req.body.refreshToken;
      const result = await authService.refreshToken(token);

      res.cookie('refreshToken', result.refreshToken, env.cookieOptions);
      res.cookie('accessToken', result.accessToken, {
        ...env.cookieOptions,
        maxAge: 15 * 60 * 1000 // 15 minutes
      });

      return sendSuccess(
        res,
        {
          user: result.user,
          accessToken: result.accessToken
        },
        'Session rafraîchie avec succès'
      );
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      if (req.user && req.user.id) {
        await authService.logout(req.user.id);
      }

      res.clearCookie('refreshToken', env.cookieOptions);
      res.clearCookie('accessToken', env.cookieOptions);

      return sendSuccess(res, {}, 'Deconnexion effectuee avec succes');
    } catch (error) {
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      const user = await authService.getMe(req.user.id);
      return sendSuccess(res, { user }, 'Profil utilisateur recupere avec succes');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
