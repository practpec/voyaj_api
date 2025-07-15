// src/modules/users/infrastructure/controllers/UserController.ts
import { Request, Response } from 'express';
import { ResponseUtils } from '../../../../shared/utils/ResponseUtils';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { EmailService } from '../../../../shared/services/EmailService';
import { EventBus } from '../../../../shared/events/EventBus';
import { ImageService } from '../../../../shared/services/ImageService';

// Use Cases
import { CreateUserUseCase } from '../../application/useCases/CreateUser';
import { LoginUserUseCase } from '../../application/useCases/LoginUser';
import { RefreshTokenUseCase } from '../../application/useCases/RefreshToken';
import { LogoutUserUseCase } from '../../application/useCases/LogoutUser';
import { VerifyEmailUseCase } from '../../application/useCases/VerifyEmail';
import { ResendVerificationUseCase } from '../../application/useCases/ResendVerification';
import { ForgotPasswordUseCase } from '../../application/useCases/ForgotPassword';
import { ResetPasswordUseCase } from '../../application/useCases/ResetPassword';
import { GetProfileUseCase } from '../../application/useCases/GetProfile';
import { UpdateProfileUseCase } from '../../application/useCases/UpdateProfile';
import { ChangePasswordUseCase } from '../../application/useCases/ChangePassword';
import { DeleteAccountUseCase } from '../../application/useCases/DeleteAccount';
import { SearchUsersUseCase } from '../../application/useCases/SearchUsers';
import { GetUserByIdUseCase } from '../../application/useCases/GetUserById';
import { RestoreUserUseCase } from '../../application/useCases/RestoreUser';
import { GetUserStatsUseCase } from '../../application/useCases/GetUserStats';
import { UploadAvatarUseCase } from '../../application/useCases/UploadAvatar';
import { UpdatePreferencesUseCase } from '../../application/useCases/UpdatePreferences';

// Repository
import { UserMongoRepository } from '../repositories/UserMongoRepository';
import { UserDTOMapper } from '../../application/dtos/CreateUserDTO';

export class UserController {
  private logger: LoggerService;
  private emailService: EmailService;
  private eventBus: EventBus;
  private userRepository: UserMongoRepository;
  private imageService: ImageService;

  // Use Cases - se inicializan en el constructor
  private createUserUseCase: CreateUserUseCase;
  private loginUserUseCase: LoginUserUseCase;
  private refreshTokenUseCase: RefreshTokenUseCase;
  private logoutUserUseCase: LogoutUserUseCase;
  private verifyEmailUseCase: VerifyEmailUseCase;
  private resendVerificationUseCase: ResendVerificationUseCase;
  private forgotPasswordUseCase: ForgotPasswordUseCase;
  private resetPasswordUseCase: ResetPasswordUseCase;
  private getProfileUseCase: GetProfileUseCase;
  private updateProfileUseCase: UpdateProfileUseCase;
  private changePasswordUseCase: ChangePasswordUseCase;
  private deleteAccountUseCase: DeleteAccountUseCase;
  private searchUsersUseCase: SearchUsersUseCase;
  private getUserByIdUseCase: GetUserByIdUseCase;
  private restoreUserUseCase: RestoreUserUseCase;
  private getUserStatsUseCase: GetUserStatsUseCase;
  private uploadAvatarUseCase: UploadAvatarUseCase;
  private updatePreferencesUseCase: UpdatePreferencesUseCase;

  constructor() {
    // Inicializar servicios
    this.logger = LoggerService.getInstance();
    this.emailService = EmailService.getInstance();
    this.eventBus = EventBus.getInstance();
    this.userRepository = new UserMongoRepository();
    this.imageService = ImageService.getInstance();

    // Inicializar casos de uso
    this.createUserUseCase = new CreateUserUseCase(
      this.userRepository,
      this.emailService,
      this.eventBus,
      this.logger
    );
    
    this.loginUserUseCase = new LoginUserUseCase(
      this.userRepository,
      this.emailService,
      this.eventBus,
      this.logger
    );

    this.refreshTokenUseCase = new RefreshTokenUseCase(this.userRepository);
    
    this.logoutUserUseCase = new LogoutUserUseCase(
      this.userRepository,
      this.emailService,
      this.eventBus,
      this.logger
    );

    this.verifyEmailUseCase = new VerifyEmailUseCase(
      this.userRepository,
      this.emailService,
      this.eventBus,
      this.logger
    );

    this.resendVerificationUseCase = new ResendVerificationUseCase(
      this.userRepository,
      this.emailService,
      this.eventBus,
      this.logger
    );

    this.forgotPasswordUseCase = new ForgotPasswordUseCase(
      this.userRepository,
      this.emailService,
      this.eventBus,
      this.logger
    );

    this.resetPasswordUseCase = new ResetPasswordUseCase(
      this.userRepository,
      this.emailService,
      this.eventBus,
      this.logger
    );

    this.getProfileUseCase = new GetProfileUseCase(this.userRepository);
    
    this.updateProfileUseCase = new UpdateProfileUseCase(
      this.userRepository,
      this.emailService,
      this.eventBus,
      this.logger
    );

    this.changePasswordUseCase = new ChangePasswordUseCase(
      this.userRepository,
      this.emailService,
      this.eventBus,
      this.logger
    );

    this.deleteAccountUseCase = new DeleteAccountUseCase(
      this.userRepository,
      this.emailService,
      this.eventBus,
      this.logger
    );

    this.searchUsersUseCase = new SearchUsersUseCase(this.userRepository);
    
    this.getUserByIdUseCase = new GetUserByIdUseCase(this.userRepository);
    
    this.restoreUserUseCase = new RestoreUserUseCase(
      this.userRepository,
      this.emailService,
      this.eventBus,
      this.logger
    );
    
    this.getUserStatsUseCase = new GetUserStatsUseCase(
      this.userRepository,
      this.emailService,
      this.eventBus,
      this.logger
    );

    this.uploadAvatarUseCase = new UploadAvatarUseCase(
      this.userRepository,
      this.imageService,
      this.logger
    );
    
    this.updatePreferencesUseCase = new UpdatePreferencesUseCase(
      this.userRepository,
      this.logger
    );
  }

  // ============================================================================
  // ENDPOINTS DE AUTENTICACIÓN
  // ============================================================================

  // POST /api/users/register
  public register = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.createUserUseCase.execute(req.body);
      ResponseUtils.registerSuccess(res, result.user, result.tokens);
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // POST /api/users/login
  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.loginUserUseCase.execute(req.body, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      ResponseUtils.loginSuccess(res, result.user, result.tokens);
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // POST /api/users/refresh-token
  public refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.refreshTokenUseCase.execute(req.body);
      ResponseUtils.tokenRefreshed(res, result.tokens);
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // POST /api/users/logout
  public logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const userId = req.user!.userId;
      
      await this.logoutUserUseCase.execute(userId, refreshToken);
      ResponseUtils.logoutSuccess(res);
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // ============================================================================
  // ENDPOINTS DE VERIFICACIÓN
  // ============================================================================

  // POST /api/users/verify-email
  public verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.verifyEmailUseCase.execute(req.body);
      ResponseUtils.emailVerified(res);
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // POST /api/users/resend-verification
  public resendVerification = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.resendVerificationUseCase.execute(req.body);
      ResponseUtils.verificationCodeSent(res);
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // ============================================================================
  // ENDPOINTS DE RECUPERACIÓN DE CONTRASEÑA
  // ============================================================================

  // POST /api/users/forgot-password
  public forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.forgotPasswordUseCase.execute(req.body, req.ip);
      ResponseUtils.verificationCodeSent(res);
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // POST /api/users/reset-password
  public resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.resetPasswordUseCase.execute(req.body, req.ip);
      ResponseUtils.passwordChanged(res);
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // ============================================================================
  // ENDPOINTS DE GESTIÓN DE PERFIL
  // ============================================================================

  // GET /api/users/profile
  public getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const user = await this.userRepository.findById(userId);
      
      if (!user) {
        ResponseUtils.error(res, 404, 'USER_NOT_FOUND', 'Usuario no encontrado');
        return;
      }

      if (user.isDeleted) {
        ResponseUtils.error(res, 400, 'USER_DELETED', 'Usuario eliminado');
        return;
      }

      const profile = UserDTOMapper.toAuthenticatedUser(user.toPublicData());
      ResponseUtils.success(res, profile, 'Perfil obtenido exitosamente');
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // PUT /api/users/profile
  public updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const user = await this.userRepository.findById(userId);
      
      if (!user) {
        ResponseUtils.error(res, 404, 'USER_NOT_FOUND', 'Usuario no encontrado');
        return;
      }

      if (user.isDeleted) {
        ResponseUtils.error(res, 400, 'USER_DELETED', 'Usuario eliminado');
        return;
      }

      // Actualizar perfil básico
      user.updateProfile(req.body.nombre, req.body.url_foto_perfil);
      
      // Actualizar campos extendidos si hay datos usando los métodos que ya existen
      if (req.body.telefono !== undefined || req.body.pais !== undefined || 
          req.body.ciudad !== undefined || req.body.fecha_nacimiento !== undefined || 
          req.body.biografia !== undefined) {
        
        // Usar el método updateExtendedProfile que está en el modelo User
        const updates: any = {};
        if (req.body.telefono !== undefined) updates.phone = req.body.telefono;
        if (req.body.pais !== undefined) updates.country = req.body.pais;
        if (req.body.ciudad !== undefined) updates.city = req.body.ciudad;
        if (req.body.fecha_nacimiento !== undefined) updates.birthDate = new Date(req.body.fecha_nacimiento);
        if (req.body.biografia !== undefined) updates.bio = req.body.biografia;
        
        user.updateExtendedProfile(updates);
      }

      await this.userRepository.update(user);
      
      const updatedProfile = UserDTOMapper.toAuthenticatedUser(user.toPublicData());
      ResponseUtils.profileUpdated(res, updatedProfile);
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // PUT /api/users/change-password
  public changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      await this.changePasswordUseCase.execute(userId, req.body, req.ip);
      ResponseUtils.passwordChanged(res);
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // DELETE /api/users/account
  public deleteAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      await this.deleteAccountUseCase.execute(userId);
      ResponseUtils.accountDeleted(res);
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // ============================================================================
  // NUEVOS ENDPOINTS
  // ============================================================================

  // POST /api/users/avatar
  public uploadAvatar = async (req: Request, res: Response): Promise<void> => {
    try {
      const file = (req as any).file;
      if (!file) {
        ResponseUtils.error(res, 400, 'MISSING_FILE', 'Archivo de imagen requerido');
        return;
      }

      const userId = req.user!.userId;
      
      const result = await this.uploadAvatarUseCase.execute(userId, {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      });

      ResponseUtils.success(res, result, 'Avatar actualizado exitosamente');
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // PUT /api/users/preferences
  public updatePreferences = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const updatedProfile = await this.updatePreferencesUseCase.execute(userId, req.body);
      
      ResponseUtils.success(res, updatedProfile, 'Preferencias actualizadas exitosamente');
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // ============================================================================
  // ENDPOINTS DE BÚSQUEDA Y CONSULTA
  // ============================================================================

  // GET /api/users/search
  public searchUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.searchUsersUseCase.execute(req.query as any);
      ResponseUtils.searchResults(
        res,
        result.data,
        result.pagination,
        req.query.query as string
      );
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // GET /api/users/:id
  public getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.params.id) {
        ResponseUtils.error(res, 400, 'INVALID_PARAMS', 'ID de usuario requerido');
        return;
      }

      const user = await this.getUserByIdUseCase.execute(req.params.id);
      ResponseUtils.success(res, user, 'Usuario obtenido exitosamente');
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // POST /api/users/:id/restore
  public restoreUser = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.params.id) {
        ResponseUtils.error(res, 400, 'INVALID_PARAMS', 'ID de usuario requerido');
        return;
      }

      const userId = req.params.id;
      const adminUserId = req.user?.userId;

      if (!adminUserId) {
        ResponseUtils.error(res, 401, 'UNAUTHORIZED', 'Usuario administrador requerido');
        return;
      }

      const restoredUser = await this.restoreUserUseCase.execute(userId, adminUserId);
      ResponseUtils.success(res, restoredUser, 'Usuario restaurado exitosamente');
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // ============================================================================
  // ENDPOINTS DE ADMINISTRACIÓN
  // ============================================================================

  // GET /api/users/admin/stats
  public getUserStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.getUserStatsUseCase.execute();
      ResponseUtils.success(res, stats, 'Estadísticas obtenidas exitosamente');
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // ============================================================================
  // ENDPOINTS DEL SISTEMA
  // ============================================================================

  // GET /api/users/health
  public healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      const healthStatus = {
        status: 'ok',
        timestamp: new Date(),
        uptime: process.uptime(),
        database: {
          connected: true,
          ping: 'N/A'
        },
        cache: {
          size: 0,
          memoryUsage: process.memoryUsage().heapUsed
        },
        version: process.env.APP_VERSION || '1.0.0'
      };

      ResponseUtils.healthCheck(res, healthStatus);
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // GET /api/users (info de la API)
  public apiInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      const apiInfo = {
        name: 'Voyaj API - Users Module',
        version: process.env.APP_VERSION || '1.0.0',
        description: 'API para gestión de usuarios de la plataforma Voyaj',
        endpoints: {
          auth: [
            'POST /api/users/register',
            'POST /api/users/login',
            'POST /api/users/refresh-token',
            'POST /api/users/logout'
          ],
          verification: [
            'POST /api/users/verify-email',
            'POST /api/users/resend-verification'
          ],
          passwordRecovery: [
            'POST /api/users/forgot-password',
            'POST /api/users/reset-password'
          ],
          profile: [
            'GET /api/users/profile',
            'PUT /api/users/profile',
            'PUT /api/users/change-password',
            'POST /api/users/avatar',
            'PUT /api/users/preferences',
            'DELETE /api/users/account'
          ],
          search: [
            'GET /api/users/search',
            'GET /api/users/:id'
          ],
          admin: [
            'GET /api/users/admin/stats',
            'POST /api/users/:id/restore'
          ],
          system: [
            'GET /api/users/health',
            'GET /api/users'
          ]
        },
        documentation: 'https://docs.voyaj.com'
      };

      ResponseUtils.apiInfo(res, apiInfo);
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };
}