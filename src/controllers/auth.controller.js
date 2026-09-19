/**
 * Contrôleur d'authentification (AuthController).
 * Orchestration des requêtes de session avec canal de transmission hybride (Cookie + JSON Payload).
 */

const authService = require('../services/auth.service');
const { sendSuccess } = require('../utils/responseHelper');
const env = require('../config/environment');

class AuthController {
  /**
   * Connexion administrateur ou livreur.
   */
  async login(req, res, next) {
    try {
      const { identifier, password } = req.body;
      const ipAddress = req.ip || req.connection?.remoteAddress;

      const result = await authService.login({ identifier, password, ipAddress });

      // Canal de transmission hybride : Cookie httpOnly sécurisé + Payload JSON
      res.cookie('refreshToken', result.refreshToken, env.cookieOptions);
      res.cookie('accessToken', result.accessToken, {
        ...env.cookieOptions,
        maxAge: 15 * 60 * 1000 // 15 minutes
      });

      return sendSuccess(
        res,
        {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken
        },
        'Connexion réussie avec succès'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Inscription d'un compte Administrateur protégé par clé privée.
   */
  async registerAdmin(req, res, next) {
    try {
      const { name, email, phone, password, privateKey } = req.body;
      const ipAddress = req.ip || req.connection?.remoteAddress;

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
          accessToken: result.accessToken,
          refreshToken: result.refreshToken
        },
        'Compte administrateur créé avec succès',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Rafraîchissement sécurisé de session avec support Cookie, Body et En-tête.
   */
  async refreshToken(req, res, next) {
    try {
      const token =
        req.cookies?.refreshToken ||
        req.body?.refreshToken ||
        req.headers['x-refresh-token'];

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
          accessToken: result.accessToken,
          refreshToken: result.refreshToken
        },
        'Session rafraîchie avec succès'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Déconnexion complète et révocation de la session côté serveur.
   */
  async logout(req, res, next) {
    try {
      if (req.user?.id) {
        await authService.logout(req.user.id);
      }

      res.clearCookie('refreshToken', env.cookieOptions);
      res.clearCookie('accessToken', env.cookieOptions);

      return sendSuccess(res, {}, 'Déconnexion effectuée avec succès');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Récupération du profil de l'utilisateur authentifié.
   */
  async getMe(req, res, next) {
    try {
      const user = await authService.getMe(req.user.id);
      return sendSuccess(res, { user }, 'Profil utilisateur récupéré avec succès');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
