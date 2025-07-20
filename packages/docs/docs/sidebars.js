module.exports = {
  docs: [
    {
      type: "doc",
      id: "intro",
      label: "Introduction",
    },
    {
      type: "doc",
      id: "getting-started",
      label: "Getting Started",
    },
    {
      type: "category",
      label: "Core Concepts",
      items: [
        "setting-auth-and-roles",
        "file-upload",
        "validation",
        "interceptors",
        "error-handling",
      ],
    },
    {
      type: "category",
      label: "Advanced Topics",
      items: ["testing", "deployment", "security", "performance"],
    },
    {
      type: "category",
      label: "API Reference",
      items: [
        "api/authentication",
        "api/file-upload",
        "api/validation",
        "api/error-handling",
        "api/interceptors",
      ],
    },
  ],
};
