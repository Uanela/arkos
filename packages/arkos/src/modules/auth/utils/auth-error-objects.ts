import AppError from "../../error-handler/utils/app-error";

export const loginRequiredError = new AppError(
  "You are not logged in! please log in to get access",
  401,
  {},
  "LoginRequired"
);

export const invaliAuthTokenError = new AppError(
  "Your auth token is invalid, please login again.",
  401,
  {},
  "InvalidAuthToken"
);
