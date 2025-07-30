import os
import json

# Definir la estructura de los archivos
postman_files = {
    "postman_environment.json": {
        "id": "tu-environment-id",
        "name": "Travel App Environment",
        "values": [
            {
                "key": "base_url",
                "value": "https://api.tuapp.com",
                "enabled": True
            },
            {
                "key": "auth_token",
                "value": "",
                "enabled": True
            }
        ],
        "_postman_variable_scope": "environment"
    },
    "1_auth_collection.json": {
        "info": {
            "name": "01 - Auth",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "item": []
    },
    "2_trips_collection.json": {
        "info": {
            "name": "02 - Trips",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "item": []
    },
    "3_expenses_collection.json": {
        "info": {
            "name": "03 - Expenses",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "item": []
    },
    "4_photos_collection.json": {
        "info": {
            "name": "04 - Photos",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "item": []
    },
    "5_journal_entries_collection.json": {
        "info": {
            "name": "05 - Journal Entries",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "item": []
    },
    "6_friendships_collection.json": {
        "info": {
            "name": "06 - Friendships",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "item": []
    },
    "7_plan_deviations_collection.json": {
        "info": {
            "name": "07 - Plan Deviations",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "item": []
    },
    "8_health_check_collection.json": {
        "info": {
            "name": "08 - Health Check",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "item": []
    }
}

# Crear los archivos en la carpeta postman
for filename, content in postman_files.items():
    filepath = os.path.join("postman", filename)
    with open(filepath, 'w') as f:
        json.dump(content, f, indent=2)