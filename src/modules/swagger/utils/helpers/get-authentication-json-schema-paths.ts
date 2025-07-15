import { OpenAPIV3 } from "openapi-types";
import { getSchemaRef } from "./swagger.router.helpers";
import { getArkosConfig } from "../../../../server";

export function getAuthenticationJsonSchemaPaths() {
  const mode = getArkosConfig().swagger?.mode;
  const paths: OpenAPIV3.PathsObject = {};

  if (!mode) return paths;
  // Add login endpoint
  paths["/api/auth/login"] = {
    post: {
      tags: ["Authentication"],
      summary: "Login to the system",
      description: "Authenticates a user and returns an access token",
      operationId: "login",
      requestBody: {
        description: "User credentials",
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: getSchemaRef("Login", mode),
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Login successful",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  accessToken: {
                    type: "string",
                    description: "JWT access token",
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Invalid input data",
        },
        "401": {
          description: "Invalid credentials",
        },
      },
    },
  };

  // Add logout endpoint
  paths["/api/auth/logout"] = {
    delete: {
      tags: ["Authentication"],
      summary: "Logout from the system",
      description: "Invalidates the current user's JWT token",
      operationId: "logout",
      security: [{ BearerAuth: [] }],
      responses: {
        "204": {
          description: "Logout successful",
        },
        "401": {
          description: "Authentication required",
        },
      },
    },
  };

  // Add signup endpoint
  paths["/api/auth/signup"] = {
    post: {
      tags: ["Authentication"],
      summary: "Register a new user",
      description: "Creates a new user account",
      operationId: "signup",
      requestBody: {
        description: "User registration data",
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: getSchemaRef("Signup", mode),
            },
          },
        },
      },
      responses: {
        "201": {
          description: "User created successfully",
          content: {
            "application/json": {
              schema: {
                $ref: getSchemaRef("User", mode),
              },
            },
          },
        },
        "400": {
          description: "Invalid input data",
        },
        "409": {
          description: "User already exists",
        },
      },
    },
  };

  // Add update password endpoint
  paths["/api/auth/update-password"] = {
    post: {
      tags: ["Authentication"],
      summary: "Update user password",
      description: "Changes the password for the authenticated user",
      operationId: "updatePassword",
      security: [{ BearerAuth: [] }],
      requestBody: {
        description: "Current and new password",
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: getSchemaRef("UpdatePassword", mode),
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Password updated successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: {
                    type: "string",
                    example: "success",
                  },
                  message: {
                    type: "string",
                    example: "Password updated successfully!",
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Invalid input data or current password incorrect",
        },
        "401": {
          description: "Authentication required",
        },
      },
    },
  };

  // Add get current user endpoint
  paths["/users/me"] = {
    get: {
      tags: ["Users"],
      summary: "Get current user information",
      description:
        "Retrieves information about the currently authenticated user",
      operationId: "getCurrentUser",
      security: [{ BearerAuth: [] }],
      responses: {
        "200": {
          description: "User information retrieved successfully",
          content: {
            "application/json": {
              schema: {
                $ref: getSchemaRef("FindMe", mode),
              },
            },
          },
        },
        "401": {
          description: "Authentication required",
        },
      },
    },
  };

  // Add update current user endpoint
  paths["/users/me"] = {
    patch: {
      tags: ["Users"],
      summary: "Update current user information",
      description: "Updates information for the currently authenticated user",
      operationId: "updateCurrentUser",
      security: [{ BearerAuth: [] }],
      requestBody: {
        description: "User data to update",
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: getSchemaRef("UpdateMe", mode),
            },
          },
        },
      },
      responses: {
        "200": {
          description: "User updated successfully",
          content: {
            "application/json": {
              schema: {
                $ref: getSchemaRef("User", mode),
              },
            },
          },
        },
        "400": {
          description: "Invalid input data",
        },
        "401": {
          description: "Authentication required",
        },
      },
    },
  };

  // Add delete current user endpoint
  paths["/users/me"] = {
    delete: {
      tags: ["Users"],
      summary: "Delete current user account",
      description: "Marks the current user's account as deleted",
      operationId: "deleteCurrentUser",
      security: [{ BearerAuth: [] }],
      responses: {
        "200": {
          description: "Account deleted successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: {
                    type: "string",
                    example: "Account deleted successfully",
                  },
                },
              },
            },
          },
        },
        "401": {
          description: "Authentication required",
        },
      },
    },
  };

  return paths;
}
