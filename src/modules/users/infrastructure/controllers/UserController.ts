import { Request, Response } from 'express';
import { ResponseUtils } from '../../../../shared/utils/ResponseUtils';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { EmailService } from '../../../../shared/services/EmailService';
import { EventBus } from '../../../../shared/events/EventBus';

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

// Repository
import { UserMongoRepository } from '../repositories/UserMongoRepository';

export class UserController {
  private logger: LoggerService;
  private emailService: EmailService;
  private eventBus: EventBus;
  private userRepository: UserMongoRepository;

  // Use Cases
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

  constructor() {
    this.logger = LoggerService.getInstance();
    this.emailService = EmailService.getInstance();
    this.eventBus = EventBus.getInstance();
    this.userRepository = new UserMongoRepository();

    // Inicializar casos de uso
    this.initializeUseCases();
  }

  private initializeUseCases(): void {
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
  }

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

  // GET /api/users/profile
  public getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const profile = await this.getProfileUseCase.execute(userId);
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
      const updatedProfile = await this.updateProfileUseCase.execute(userId, req.body);
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

  // POST /api/users/:id/restore (Solo admin)
  public restoreUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params.id;
      const adminUserId = req.user!.userId;
      
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

  // GET /api/users/admin/stats (Solo admin)
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

  // GET /health
  public healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      const dbConnection = require('../../../../shared/database/Connection').DatabaseConnection.getInstance();
      const cacheService = require('../../../../shared/services/CacheService').CacheService.getInstance();
      
      const [dbHealth, cacheStats] = await Promise.all([
        dbConnection.healthCheck(),
        Promise.resolve(cacheService.getStats())
      ]);

      const healthStatus = {
        status: dbHealth.connected ? 'ok' : 'error',
        timestamp: new Date(),
        uptime: process.uptime(),
        database: {
          connected: dbHealth.connected,
          ping: dbHealth.ping
        },
        cache: {
          size: cacheStats.size,
          memoryUsage: cacheStats.memoryUsage
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

  // GET /api
  public apiInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      const apiInfo = {
        name: 'Voyaj API',
        version: process.env.APP_VERSION || '1.0.0',
        description: 'API para la plataforma de planificación de viajes Voyaj',
        endpoints: {
          auth: [
            'POST /api/users/register',
            'POST /api/users/login',
            'POST /api/users/refresh-token',
            'POST /api/users/logout'
          ],
          users: [
            'GET /api/users/profile',
            'PUT /api/users/profile',
            'PUT /api/users/change-password',
            'DELETE /api/users/account',
            'GET /api/users/search',
            'GET /api/users/:id',
            'POST /api/users/verify-email',
            'POST /api/users/resend-verification',
            'POST /api/users/forgot-password',
            'POST /api/users/reset-password'
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