import os
from pathlib import Path

def create_directory_structure():
    base_path = Path("src")
    
    # Shared infrastructure
    shared_infra = [
        "shared/infrastructure/middleware",
        "shared/infrastructure/utils",
        "shared/infrastructure/constants"
    ]
    
    shared_files = [
        "shared/infrastructure/middleware/__init__.py",
        "shared/infrastructure/middleware/cors_middleware.py",
        "shared/infrastructure/middleware/rate_limiting.py",
        "shared/infrastructure/middleware/logging_middleware.py",
        "shared/infrastructure/middleware/exception_handler.py",
        "shared/infrastructure/utils/__init__.py",
        "shared/infrastructure/utils/date_utils.py",
        "shared/infrastructure/utils/currency_converter.py",
        "shared/infrastructure/utils/validators.py",
        "shared/infrastructure/constants/__init__.py",
        "shared/infrastructure/constants/error_codes.py",
        "shared/infrastructure/constants/status_codes.py"
    ]
    
    # Subscriptions
    subscriptions = [
        "subscriptions/application",
        "subscriptions/domain",
        "subscriptions/infrastructure/http",
        "subscriptions/infrastructure/persistence"
    ]
    
    subscription_files = [
        "subscriptions/__init__.py",
        "subscriptions/application/__init__.py",
        "subscriptions/application/upgrade_subscription.py",
        "subscriptions/application/cancel_subscription.py",
        "subscriptions/application/check_limits.py",
        "subscriptions/domain/__init__.py",
        "subscriptions/domain/subscription.py",
        "subscriptions/domain/plan.py",
        "subscriptions/domain/subscription_repository.py",
        "subscriptions/infrastructure/__init__.py",
        "subscriptions/infrastructure/http/__init__.py",
        "subscriptions/infrastructure/http/subscriptions_router.py",
        "subscriptions/infrastructure/http/subscriptions_schemas.py",
        "subscriptions/infrastructure/persistence/__init__.py",
        "subscriptions/infrastructure/persistence/mongo_subscription_repository.py"
    ]
    
    # Create directories
    for directory in shared_infra + subscriptions:
        dir_path = base_path / directory
        if not dir_path.exists():
            os.makedirs(dir_path)
            print(f"Created directory: {dir_path}")
    
    # Create files
    for file in shared_files + subscription_files:
        file_path = base_path / file
        if not file_path.exists():
            file_path.touch()
            print(f"Created file: {file_path}")
    
    print("\nEstructura de directorios creada con éxito!")

if __name__ == "__main__":
    create_directory_structure()