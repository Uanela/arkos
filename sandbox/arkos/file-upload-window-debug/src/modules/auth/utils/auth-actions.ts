const authActions = [
  {
    "roles": [],
    "action": "View",
    "resource": "auth-action",
    "name": "View auth action",
    "description": "View an auth action",
    "errorMessage": "You do not have permission to perform this operation"
  },
  {
    "roles": [],
    "action": "CustomAction",
    "resource": "file-upload",
    "name": "Custom Action File Upload",
    "description": "Custom Action File Upload",
    "errorMessage": "You do not have permission to perform this operation"
  },
  {
    "roles": [],
    "action": "View",
    "resource": "file-upload",
    "name": "View File Upload",
    "description": "View File Upload",
    "errorMessage": "You do not have permission to perform this operation"
  },
  {
    "roles": [],
    "action": "Create",
    "resource": "file-upload",
    "name": "Create File Upload",
    "description": "Create File Upload",
    "errorMessage": "You do not have permission to perform this operation"
  },
  {
    "roles": [],
    "action": "Update",
    "resource": "file-upload",
    "name": "Update File Upload",
    "description": "Update File Upload",
    "errorMessage": "You do not have permission to perform this operation"
  },
  {
    "roles": [],
    "action": "Delete",
    "resource": "file-upload",
    "name": "Delete File Upload",
    "description": "Delete File Upload",
    "errorMessage": "You do not have permission to perform this operation"
  },
  {
    "action": "View",
    "resource": "auth",
    "roles": [],
    "name": "View Auth",
    "description": "View Auth",
    "errorMessage": "You do not have permission to perform this operation"
  },
  {
    "action": "Create",
    "resource": "user",
    "roles": [
      "Admin",
      "User"
    ],
    "name": "Create New Usera",
    "description": "Permission to create user records",
    "errorMessage": "You do not have permission to perform this operation"
  },
  {
    "action": "View",
    "resource": "user",
    "roles": [],
    "name": "View User",
    "description": "View User",
    "errorMessage": "You do not have permission to perform this operation"
  },
  {
    "action": "Update",
    "resource": "user",
    "roles": [],
    "name": "Update User",
    "description": "Update User",
    "errorMessage": "You do not have permission to perform this operation"
  },
  {
    "action": "Delete",
    "resource": "user",
    "roles": [],
    "name": "Delete User",
    "description": "Delete User",
    "errorMessage": "You do not have permission to perform this operation"
  }
];

export default authActions;
