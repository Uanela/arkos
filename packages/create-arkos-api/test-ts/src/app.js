// import arkos from "arkos";
const arkos = require("arkos");
const { default: userRouter } = require("./modules/user/user.router");

arkos.default.init({
  authentication: {
    mode: "static",
    login: {
      allowedUsernames: ["email"],
    },
  },
  validation: {
    resolver: "zod",
  },
  routers: {
    additional: [userRouter],
  },
});
