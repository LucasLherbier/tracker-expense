{
  "version": "5",
  "dialect": "mysql",
  "id": "78419f3d-d19a-4f3a-85c9-b1f5efdc17fc",
  "prevId": "e60b807a-5219-4328-8f9b-b5a5fe3720fd",
  "tables": {
    "categories": {
      "name": "categories",
      "columns": {
        "id": {
          "name": "id",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": true
        },
        "name": {
          "name": "name",
          "type": "varchar(100)",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "displayOrder": {
          "name": "displayOrder",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "createdAt": {
          "name": "createdAt",
          "type": "timestamp",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": "(now())"
        }
      },
      "indexes": {},
      "foreignKeys": {},
      "compositePrimaryKeys": {
        "categories_id": {
          "name": "categories_id",
          "columns": [
            "id"
          ]
        }
      },
      "uniqueConstraints": {
        "categories_name_unique": {
          "name": "categories_name_unique",
          "columns": [
            "name"
          ]
        }
      },
      "checkConstraint": {}
    },
    "exchangeRates": {
      "name": "exchangeRates",
      "columns": {
        "id": {
          "name": "id",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": true
        },
        "fromCurrency": {
          "name": "fromCurrency",
          "type": "varchar(3)",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "toCurrency": {
          "name": "toCurrency",
          "type": "varchar(3)",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "rate": {
          "name": "rate",
          "type": "varchar(20)",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "date": {
          "name": "date",
          "type": "timestamp",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "createdAt": {
          "name": "createdAt",
          "type": "timestamp",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": "(now())"
        }
      },
      "indexes": {},
      "foreignKeys": {},
      "compositePrimaryKeys": {
        "exchangeRates_id": {
          "name": "exchangeRates_id",
          "columns": [
            "id"
          ]
        }
      },
      "uniqueConstraints": {},
      "checkConstraint": {}
    },
    "expenses": {
      "name": "expenses",
      "columns": {
        "id": {
          "name": "id",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": true
        },
        "userId": {
          "name": "userId",
          "type": "int",
          "primaryKey": false,
          "notNull": false,
          "autoincrement": false
        },
        "day": {
          "name": "day",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "month": {
          "name": "month",
          "type": "varchar(50)",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "year": {
          "name": "year",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "amountOriginal": {
          "name": "amountOriginal",
          "type": "varchar(20)",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "currencyOriginal": {
          "name": "currencyOriginal",
          "type": "varchar(3)",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "amountEur": {
          "name": "amountEur",
          "type": "varchar(20)",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "exchangeRate": {
          "name": "exchangeRate",
          "type": "varchar(20)",
          "primaryKey": false,
          "notNull": false,
          "autoincrement": false
        },
        "categoryId": {
          "name": "categoryId",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "note": {
          "name": "note",
          "type": "text",
          "primaryKey": false,
          "notNull": false,
          "autoincrement": false
        },
        "createdAt": {
          "name": "createdAt",
          "type": "timestamp",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": "(now())"
        },
        "updatedAt": {
          "name": "updatedAt",
          "type": "timestamp",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "onUpdate": true,
          "default": "(now())"
        },
        "syncedToSheet": {
          "name": "syncedToSheet",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": 0
        },
        "sheetRowId": {
          "name": "sheetRowId",
          "type": "int",
          "primaryKey": false,
          "notNull": false,
          "autoincrement": false
        }
      },
      "indexes": {},
      "foreignKeys": {},
      "compositePrimaryKeys": {
        "expenses_id": {
          "name": "expenses_id",
          "columns": [
            "id"
          ]
        }
      },
      "uniqueConstraints": {},
      "checkConstraint": {}
    },
    "googleTokens": {
      "name": "googleTokens",
      "columns": {
        "id": {
          "name": "id",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": true
        },
        "accessToken": {
          "name": "accessToken",
          "type": "text",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "refreshToken": {
          "name": "refreshToken",
          "type": "text",
          "primaryKey": false,
          "notNull": false,
          "autoincrement": false
        },
        "expiresAt": {
          "name": "expiresAt",
          "type": "timestamp",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "scope": {
          "name": "scope",
          "type": "varchar(500)",
          "primaryKey": false,
          "notNull": false,
          "autoincrement": false
        },
        "createdAt": {
          "name": "createdAt",
          "type": "timestamp",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": "(now())"
        },
        "updatedAt": {
          "name": "updatedAt",
          "type": "timestamp",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "onUpdate": true,
          "default": "(now())"
        }
      },
      "indexes": {},
      "foreignKeys": {},
      "compositePrimaryKeys": {
        "googleTokens_id": {
          "name": "googleTokens_id",
          "columns": [
            "id"
          ]
        }
      },
      "uniqueConstraints": {},
      "checkConstraint": {}
    },
    "users": {
      "name": "users",
      "columns": {
        "id": {
          "name": "id",
          "type": "int",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": true
        },
        "openId": {
          "name": "openId",
          "type": "varchar(64)",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false
        },
        "name": {
          "name": "name",
          "type": "text",
          "primaryKey": false,
          "notNull": false,
          "autoincrement": false
        },
        "email": {
          "name": "email",
          "type": "varchar(320)",
          "primaryKey": false,
          "notNull": false,
          "autoincrement": false
        },
        "loginMethod": {
          "name": "loginMethod",
          "type": "varchar(64)",
          "primaryKey": false,
          "notNull": false,
          "autoincrement": false
        },
        "role": {
          "name": "role",
          "type": "enum('user','admin')",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": "'user'"
        },
        "createdAt": {
          "name": "createdAt",
          "type": "timestamp",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": "(now())"
        },
        "updatedAt": {
          "name": "updatedAt",
          "type": "timestamp",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "onUpdate": true,
          "default": "(now())"
        },
        "lastSignedIn": {
          "name": "lastSignedIn",
          "type": "timestamp",
          "primaryKey": false,
          "notNull": true,
          "autoincrement": false,
          "default": "(now())"
        }
      },
      "indexes": {},
      "foreignKeys": {},
      "compositePrimaryKeys": {
        "users_id": {
          "name": "users_id",
          "columns": [
            "id"
          ]
        }
      },
      "uniqueConstraints": {
        "users_openId_unique": {
          "name": "users_openId_unique",
          "columns": [
            "openId"
          ]
        }
      },
      "checkConstraint": {}
    }
  },
  "views": {},
  "_meta": {
    "schemas": {},
    "tables": {},
    "columns": {}
  },
  "internal": {
    "tables": {},
    "indexes": {}
  }
}