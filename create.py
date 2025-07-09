import os

def create_structure(base_path):
    structure = {
        'src': {
            'modules': {
                'users': {
                    'domain': {
                        'interfaces': ['IUserRepository.ts'],
                        'files': ['User.ts', 'UserService.ts', 'UserEvents.ts']
                    },
                    'application': {
                        'useCases': [
                            'CreateUser.ts', 'LoginUser.ts', 'RefreshToken.ts', 
                            'LogoutUser.ts', 'ForgotPassword.ts', 'ResetPassword.ts',
                            'VerifyEmail.ts', 'ResendVerification.ts', 'GetProfile.ts',
                            'UpdateProfile.ts', 'ChangePassword.ts', 'DeleteAccount.ts',
                            'SearchUsers.ts', 'GetUserById.ts', 'RestoreUser.ts'
                        ],
                        'dtos': [
                            'CreateUserDTO.ts', 'LoginUserDTO.ts', 'UpdateProfileDTO.ts',
                            'ChangePasswordDTO.ts', 'ForgotPasswordDTO.ts', 
                            'ResetPasswordDTO.ts', 'VerifyEmailDTO.ts', 'SearchUsersDTO.ts'
                        ]
                    },
                    'infrastructure': {
                        'controllers': ['UserController.ts'],
                        'repositories': ['UserMongoRepository.ts'],
                        'routes': ['userRoutes.ts']
                    }
                }
            },
            'shared': {
                'constants': ['index.ts'],
                'database': ['Connection.ts'],
                'middleware': ['AuthMiddleware.ts', 'UploadMiddleware.ts'],
                'services': [
                    'EmailService.ts', 'TokenService.ts', 'ImageService.ts',
                    'LoggerService.ts', 'CacheService.ts'
                ],
                'utils': [
                    'ValidationUtils.ts', 'ErrorUtils.ts', 'ResponseUtils.ts',
                    'DateUtils.ts', 'PaginationUtils.ts', 'SecurityUtils.ts'
                ],
                'events': ['EventBus.ts']
            }
        }
    }

    def create_dirs(current_path, structure):
        for name, content in structure.items():
            new_path = os.path.join(current_path, name)
            os.makedirs(new_path, exist_ok=True)
            
            if isinstance(content, dict):
                create_dirs(new_path, content)
            elif isinstance(content, list):
                for item in content:
                    if isinstance(item, dict):
                        create_dirs(new_path, item)
                    elif isinstance(item, str):
                        if '.' in item:  # Es un archivo
                            open(os.path.join(new_path, item), 'a').close()
                        else:  # Es una carpeta
                            os.makedirs(os.path.join(new_path, item), exist_ok=True)

    create_dirs(base_path, structure)

if __name__ == "__main__":
    base_dir = os.getcwd()  # Asume que ya estás en voyaj_api
    create_structure(base_dir)
    print("Estructura de carpetas creada exitosamente!")