import arkos from "arkos";

arkos.init({
  authentication: {
    mode: "static",
    login: {
      allowedUsernames: ["username"],
    },
  },
  validation: {
    resolver: "zod",
  },
});
