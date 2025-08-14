import {
  handleRelationFieldsInBody,
  canBeUsedToConnect,
  // isListFieldAnArray,
  isPrismaRelationFormat,
  removeApiAction,
} from "../base.service.helpers"; // Update this path

// Mock the required helpers
jest.mock("../../../../../utils/helpers/models.helpers", () => ({
  getPrismaModelRelations: jest.fn((type) => {
    if (type === "Post") {
      return {
        singular: [{ name: "category", type: "Category" }],
        list: [
          { name: "tags", type: "Tag" },
          { name: "comments", type: "Comment" },
        ],
      };
    }
    if (type === "User") {
      return {
        singular: [{ name: "profile", type: "Profile" }],
        list: [{ name: "posts", type: "Post" }],
      };
    }
    if (type === "Comment") {
      return {
        singular: [{ name: "author", type: "User" }],
      };
    }
    return null;
  }),
  getModelUniqueFields: jest.fn((modelName) => {
    if (modelName === "Category") {
      return [{ name: "name" }];
    }
    if (modelName === "Tag") {
      return [{ name: "name" }];
    }
    if (modelName === "User") {
      return [{ name: "email" }, { name: "username" }];
    }
    return [];
  }),
  RelationField: {}, // Add this to satisfy TypeScript if needed
  RelationFields: {}, // Add this to satisfy TypeScript if needed
}));

describe("handleRelationFieldsInBody", () => {
  describe("Singular Relations", () => {
    it("should handle create operation for singular relation without id", () => {
      const body = {
        name: "John Doe",
        profile: {
          bio: "Software Engineer",
          avatarUrl: "https://example.com/avatar.jpg",
        },
      };

      const relationFields = {
        singular: [{ name: "profile", type: "Profile" }],
        list: [],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      expect(result).toEqual({
        name: "John Doe",
        profile: {
          create: {
            bio: "Software Engineer",
            avatarUrl: "https://example.com/avatar.jpg",
          },
        },
      });
    });

    it("should handle connect operation for singular relation with only id", () => {
      const body = {
        name: "John Doe",
        profile: {
          id: "123",
        },
      };

      const relationFields = {
        singular: [{ name: "profile", type: "Profile" }],
        list: [],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      expect(result).toEqual({
        name: "John Doe",
        profile: {
          connect: {
            id: "123",
          },
        },
      });
    });

    it("should handle connect operation for singular relation with unique field", () => {
      const body = {
        name: "John Doe",
        category: {
          name: "Technology",
        },
      };

      const relationFields = {
        singular: [
          {
            name: "category",
            type: "Category",
          },
        ],
        list: [],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      expect(result).toEqual({
        name: "John Doe",
        category: {
          connect: {
            name: "Technology",
          },
        },
      });
    });

    it("should handle update operation for singular relation with id and other fields", () => {
      const body = {
        name: "John Doe",
        profile: {
          id: "123",
          bio: "Updated Bio",
          avatarUrl: "https://example.com/new-avatar.jpg",
        },
      };

      const relationFields = {
        singular: [{ name: "profile", type: "Profile" }],
        list: [],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      expect(result).toEqual({
        name: "John Doe",
        profile: {
          update: {
            where: {
              id: "123",
            },
            data: {
              bio: "Updated Bio",
              avatarUrl: "https://example.com/new-avatar.jpg",
            },
          },
        },
      });
    });

    it("should handle explicit connect operation with apiAction", () => {
      const body = {
        name: "John Doe",
        profile: {
          id: "123",
          apiAction: "connect",
        },
      };

      const relationFields = {
        singular: [{ name: "profile", type: "Profile" }],
        list: [],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      expect(result).toEqual({
        name: "John Doe",
        profile: {
          connect: {
            id: "123",
          },
        },
      });
    });
    it("should handle delete operation for singular relation with apiAction: 'delete'", () => {
      const body = {
        name: "John Doe",
        profile: {
          id: "123",
          apiAction: "delete",
        },
      };

      const relationFields = {
        singular: [{ name: "profile", type: "Profile" }],
        list: [],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      expect(result).toEqual({
        name: "John Doe",
        profile: {
          delete: true,
        },
      });
    });

    it("should handle disconnect operation for singular relation with apiAction: 'disconnect'", () => {
      const body = {
        name: "John Doe",
        profile: {
          id: "123",
          apiAction: "disconnect",
        },
      };

      const relationFields = {
        singular: [{ name: "profile", type: "Profile" }],
        list: [],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      expect(result).toEqual({
        name: "John Doe",
        profile: {
          disconnect: true,
        },
      });
    });
  });

  describe("List Relations", () => {
    it("should handle create operation for list relation items without ids", () => {
      const body = {
        title: "My Post",
        tags: [
          { name: "JavaScript", apiAction: "create" },
          { name: "TypeScript", apiAction: "create" },
        ],
      };

      const relationFields = {
        singular: [],
        list: [{ name: "tags", type: "Tag" }],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      expect(result).toEqual({
        title: "My Post",
        tags: {
          create: [{ name: "JavaScript" }, { name: "TypeScript" }],
        },
      });
    });

    it("should handle connect operation for list relation items with only ids", () => {
      const body = {
        title: "My Post",
        tags: [{ id: "1" }, { id: "2" }],
      };

      const relationFields = {
        singular: [],
        list: [{ name: "tags", type: "Tag" }],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      expect(result).toEqual({
        title: "My Post",
        tags: {
          connect: [{ id: "1" }, { id: "2" }],
        },
      });
    });

    it("should handle connect operation for list relation items with unique fields", () => {
      const body = {
        title: "My Post",
        tags: [{ name: "JavaScript" }, { name: "TypeScript" }],
      };

      const relationFields = {
        singular: [],
        list: [{ name: "tags", type: "Tag" }],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      expect(result).toEqual({
        title: "My Post",
        tags: {
          connect: [{ name: "JavaScript" }, { name: "TypeScript" }],
        },
      });
    });

    it("should handle update operation for list relation items with ids and other fields", () => {
      const body = {
        title: "My Post",
        tags: [
          { id: "1", name: "Updated JavaScript" },
          { id: "2", name: "Updated TypeScript" },
        ],
      };

      const relationFields = {
        singular: [],
        list: [{ name: "tags", type: "Tag" }],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      expect(result).toEqual({
        title: "My Post",
        tags: {
          update: [
            { where: { id: "1" }, data: { name: "Updated JavaScript" } },
            { where: { id: "2" }, data: { name: "Updated TypeScript" } },
          ],
        },
      });
    });

    it('should handle deleteMany operation for list relation items with apiAction: "delete"', () => {
      const body = {
        title: "My Post",
        tags: [
          { id: "1", apiAction: "delete" },
          { id: "2", apiAction: "delete" },
        ],
      };

      const relationFields = {
        singular: [],
        list: [{ name: "tags", type: "Tag" }],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      expect(result).toEqual({
        title: "My Post",
        tags: {
          deleteMany: {
            id: { in: ["1", "2"] },
          },
        },
      });
    });

    it('should handle disconnect operation for list relation items with apiAction: "disconnect"', () => {
      const body = {
        title: "My Post",
        tags: [
          { id: "1", apiAction: "disconnect" },
          { id: "2", apiAction: "disconnect" },
        ],
      };

      const relationFields = {
        singular: [],
        list: [{ name: "tags", type: "Tag" }],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      expect(result).toEqual({
        title: "My Post",
        tags: {
          disconnect: [{ id: "1" }, { id: "2" }],
        },
      });
    });

    it("should handle mixed operations for list relation items", () => {
      const body = {
        title: "My Post",
        tags: [
          { name: "New Tag", apiAction: "create" }, // create
          { id: "1" }, // connect
          { id: "2", name: "Updated Tag" }, // update
          { id: "3", apiAction: "delete" }, // delete
          { id: "4", apiAction: "disconnect" }, // disconnect
        ],
      };

      const relationFields = {
        singular: [],
        list: [{ name: "tags", type: "Tag" }],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      expect(result).toEqual({
        title: "My Post",
        tags: {
          create: [{ name: "New Tag" }],
          connect: [{ id: "1" }],
          update: [{ where: { id: "2" }, data: { name: "Updated Tag" } }],
          disconnect: [{ id: "4" }],
          deleteMany: { id: { in: ["3"] } },
        },
      });
    });
  });

  describe("Nested Relations", () => {
    it("should handle nested relations recursively", () => {
      const body = {
        name: "John Doe",
        posts: [
          {
            title: "My First Post",
            category: { name: "Technology" },
            tags: [{ name: "JavaScript" }],
          },
        ],
      };

      const relationFields = {
        singular: [],
        list: [{ name: "posts", type: "Post" }],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      expect(result).toEqual({
        name: "John Doe",
        posts: {
          create: [
            {
              title: "My First Post",
              category: {
                connect: { name: "Technology" },
              },
              tags: {
                connect: [{ name: "JavaScript" }],
              },
            },
          ],
        },
      });
    });

    it("should handle deep nested relations", () => {
      const body = {
        name: "John Doe",
        posts: [
          {
            title: "My First Post",
            comments: [
              {
                content: "Great post!",
                author: { email: "user@example.com", apiAction: "create" },
              },
            ],
          },
        ],
      };

      const relationFields = {
        singular: [],
        list: [{ name: "posts", type: "Post" }],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      expect(result).toEqual({
        name: "John Doe",
        posts: {
          create: [
            {
              title: "My First Post",
              comments: {
                create: [
                  {
                    content: "Great post!",
                    author: { create: { email: "user@example.com" } },
                  },
                ],
              },
            },
          ],
        },
      });
    });

    it("should handle deeply nested array relations with multiple levels", () => {
      const body = {
        name: "John Doe",
        posts: [
          {
            title: "My First Post",
            comments: [
              {
                content: "Great post!",
                author: {
                  email: "user1@example.com",
                  posts: [
                    {
                      title: "Nested Post",
                      category: { name: "Nested Category" },
                    },
                  ],
                },
              },
              {
                id: "comment-123",
                content: "Updated comment",
                author: { id: "user-456" },
              },
            ],
          },
        ],
      };

      const relationFields = {
        singular: [],
        list: [{ name: "posts", type: "Post" }],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      expect(result).toEqual({
        name: "John Doe",
        posts: {
          create: [
            {
              title: "My First Post",
              comments: {
                create: [
                  {
                    content: "Great post!",
                    author: {
                      create: {
                        email: "user1@example.com",
                        posts: {
                          create: [
                            {
                              title: "Nested Post",
                              category: {
                                connect: { name: "Nested Category" },
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                ],
                update: [
                  {
                    where: { id: "comment-123" },
                    data: {
                      content: "Updated comment",
                      author: {
                        connect: { id: "user-456" },
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty arrays for list relation fields", () => {
      const body = {
        name: "John Doe",
        posts: [],
      };

      const relationFields = {
        singular: [],
        list: [{ name: "posts", type: "Post" }],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      expect(result).toEqual({
        name: "John Doe",
        posts: {},
      });
    });

    it("should handle null values for relation fields", () => {
      const body = {
        name: "John Doe",
        profile: null,
        posts: null,
      };

      const relationFields = {
        singular: [{ name: "profile", type: "Profile" }],
        list: [{ name: "posts", type: "Post" }],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      expect(result).toEqual({
        name: "John Doe",
        profile: null,
        posts: null,
      });
    });

    it("should skip list relation fields that are not arrays", () => {
      const body = {
        title: "My Post",
        tags: { someProperty: "not an array" }, // This should be skipped
        comments: [{ content: "Valid array" }], // This should be processed
      };

      const relationFields = {
        singular: [],
        list: [
          { name: "tags", type: "Tag" },
          { name: "comments", type: "Comment" },
        ],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      expect(result).toEqual({
        title: "My Post",
        tags: { someProperty: "not an array" }, // Unchanged
        comments: {
          create: [{ content: "Valid array" }],
        },
      });
    });
  });
});

describe("IgnoreActions Parameter", () => {
  it("should ignore specified apiActions in ignoreActions array", () => {
    const body = {
      title: "My Post",
      tags: [
        { id: "1", apiAction: "delete" },
        { id: "2", apiAction: "ignore-me" },
        { name: "New Tag", apiAction: "create" },
      ],
    };

    const relationFields = {
      singular: [],
      list: [{ name: "tags", type: "Tag" }],
    };

    const result = handleRelationFieldsInBody(body, relationFields, [
      "ignore-me",
    ]);

    expect(result).toEqual({
      title: "My Post",
      tags: {
        create: [{ name: "New Tag" }],
        deleteMany: { id: { in: ["1"] } },
        // The item with "ignore-me" should be completely ignored
      },
    });
  });

  it("should ignore specified apiActions in singular relations", () => {
    const body = {
      name: "John Doe",
      profile: {
        id: "123",
        apiAction: "skip-this",
      },
    };

    const relationFields = {
      singular: [{ name: "profile", type: "Profile" }],
      list: [],
    };

    const result = handleRelationFieldsInBody(body, relationFields, [
      "skip-this",
    ]);

    expect(result).toEqual({
      name: "John Doe",
      // profile should be completely ignored
    });
  });
});

describe("Unknown apiAction Error Handling", () => {
  it("should throw error for unknown apiAction in list relations", () => {
    const body = {
      title: "My Post",
      tags: [
        { id: "1", apiAction: "unknown-action" },
        { name: "Valid Tag" }, // This should be fine
      ],
    };

    const relationFields = {
      singular: [],
      list: [{ name: "tags", type: "Tag" }],
    };

    expect(() => {
      handleRelationFieldsInBody(body, relationFields);
    }).toThrow();
  });

  it("should throw error for unknown apiAction in singular relations", () => {
    const body = {
      name: "John Doe",
      profile: {
        id: "123",
        apiAction: "invalid-action",
      },
    };

    const relationFields = {
      singular: [{ name: "profile", type: "Profile" }],
      list: [],
    };

    expect(() => {
      handleRelationFieldsInBody(body, relationFields);
    }).toThrow();
  });

  it("should throw error for unknown apiAction in nested relations", () => {
    const body = {
      name: "John Doe",
      posts: [
        {
          title: "My Post",
          category: {
            id: "cat-123",
            apiAction: "weird-action",
          },
        },
      ],
    };

    const relationFields = {
      singular: [],
      list: [{ name: "posts", type: "Post" }],
    };

    expect(() => {
      handleRelationFieldsInBody(body, relationFields);
    }).toThrow();
  });

  it("should allow known apiActions without throwing", () => {
    const body = {
      title: "My Post",
      tags: [
        { id: "1", apiAction: "delete" },
        { id: "2", apiAction: "disconnect" },
        { id: "3", apiAction: "connect" },
        { name: "New Tag", apiAction: "create" },
      ],
    };

    const relationFields = {
      singular: [],
      list: [{ name: "tags", type: "Tag" }],
    };

    // Should not throw
    expect(() => {
      handleRelationFieldsInBody(body, relationFields);
    }).not.toThrow();
  });
});

describe("canBeUsedToConnect", () => {
  it("should return true for objects with only an id", () => {
    const modelName = "User";
    const bodyField = { id: "123" };

    expect(canBeUsedToConnect(modelName, bodyField)).toBe(true);
  });

  it("should return true for objects with a single unique field", () => {
    const modelName = "User";
    const bodyField = { email: "test@example.com" };

    expect(canBeUsedToConnect(modelName, bodyField)).toBe(true);
  });

  it("should return true for objects with a single field from uniqueFields list", () => {
    const modelName = "User";
    const bodyField = { username: "testuser" };

    expect(canBeUsedToConnect(modelName, bodyField)).toBe(true);
  });

  it("should return true for objects with apiAction set to connect", () => {
    const modelName = "User";
    const bodyField = { id: "123", apiAction: "connect" };

    expect(canBeUsedToConnect(modelName, bodyField)).toBe(true);
  });

  it("should return false for objects with multiple fields", () => {
    const modelName = "User";
    const bodyField = { id: "123", name: "John" };

    expect(canBeUsedToConnect(modelName, bodyField)).toBe(false);
  });

  it("should return false for objects with a single field that is not unique", () => {
    const modelName = "User";
    const bodyField = { name: "John" }; // assuming name is not a unique field

    expect(canBeUsedToConnect(modelName, bodyField)).toBe(false);
  });

  it("should return false for objects with apiAction set to something other than connect", () => {
    const modelName = "User";
    const bodyField = { id: "123", apiAction: "delete" };

    expect(canBeUsedToConnect(modelName, bodyField)).toBe(false);
  });

  it("should return false for null or undefined values", () => {
    const modelName = "User";

    expect(canBeUsedToConnect(modelName, null)).toBe(false);
    expect(canBeUsedToConnect(modelName, undefined)).toBe(false);
  });
});

describe("isPrismaRelationFormat", () => {
  it("should return true for objects with Prisma operations", () => {
    expect(isPrismaRelationFormat({ create: { name: "Test" } })).toBe(true);
    expect(isPrismaRelationFormat({ connect: { id: 1 } })).toBe(true);
    expect(
      isPrismaRelationFormat({
        update: { where: { id: 1 }, data: { name: "Test" } },
      })
    ).toBe(true);
    expect(isPrismaRelationFormat({ delete: { id: 1 } })).toBe(true);
    expect(isPrismaRelationFormat({ disconnect: { id: 1 } })).toBe(true);
    expect(
      isPrismaRelationFormat({ deleteMany: { id: { in: [1, 2, 3] } } })
    ).toBe(true);
    expect(
      isPrismaRelationFormat({
        connectOrCreate: {
          where: { email: "test@example.com" },
          create: { email: "test@example.com", name: "Test" },
        },
      })
    ).toBe(true);
    expect(
      isPrismaRelationFormat({
        upsert: {
          where: { id: 1 },
          update: { name: "Updated" },
          create: { name: "New" },
        },
      })
    ).toBe(true);
    expect(isPrismaRelationFormat({ set: [{ id: 1 }, { id: 2 }] })).toBe(true);
  });

  it("should return false for objects without Prisma operations", () => {
    expect(isPrismaRelationFormat({ name: "Test" })).toBe(false);
    expect(isPrismaRelationFormat({ id: 1, title: "Test" })).toBe(false);
    expect(isPrismaRelationFormat([])).toBe(false);
    expect(isPrismaRelationFormat({ apiAction: "create" })).toBe(false);
  });
});

describe("handleRelationFieldsInBody with pre-formatted relations", () => {
  describe("Pre-formatted Singular Relations", () => {
    it("should preserve pre-formatted create operation", () => {
      const body = {
        name: "John Doe",
        profile: {
          create: {
            bio: "Software Engineer",
            avatarUrl: "https://example.com/avatar.jpg",
          },
        },
      };

      const relationFields = {
        singular: [{ name: "profile", type: "Profile" }],
        list: [],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      // Should be unchanged
      expect(result).toEqual({
        name: "John Doe",
        profile: {
          create: {
            bio: "Software Engineer",
            avatarUrl: "https://example.com/avatar.jpg",
          },
        },
      });
    });

    it("should preserve pre-formatted connect operation", () => {
      const body = {
        name: "John Doe",
        profile: {
          connect: {
            id: "123",
          },
        },
      };

      const relationFields = {
        singular: [{ name: "profile", type: "Profile" }],
        list: [],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      // Should be unchanged
      expect(result).toEqual({
        name: "John Doe",
        profile: {
          connect: {
            id: "123",
          },
        },
      });
    });

    it("should preserve pre-formatted upsert operation", () => {
      const body = {
        title: "My Post",
        author: {
          upsert: {
            where: { email: "author@example.com" },
            update: { name: "Updated Author" },
            create: { email: "author@example.com", name: "New Author" },
          },
        },
      };

      const relationFields = {
        singular: [{ name: "author", type: "User" }],
        list: [],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      // Should be unchanged
      expect(result).toEqual({
        title: "My Post",
        author: {
          upsert: {
            where: { email: "author@example.com" },
            update: { name: "Updated Author" },
            create: { email: "author@example.com", name: "New Author" },
          },
        },
      });
    });
  });

  describe("Pre-formatted List Relations", () => {
    it("should preserve pre-formatted connect operations in list", () => {
      const body = {
        title: "My Post",
        tags: {
          connect: [{ id: "1" }, { id: "2" }],
        },
      };

      const relationFields = {
        singular: [],
        list: [{ name: "tags", type: "Tag" }],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      // Should be unchanged
      expect(result).toEqual({
        title: "My Post",
        tags: {
          connect: [{ id: "1" }, { id: "2" }],
        },
      });
    });

    it("should preserve pre-formatted create operations in list", () => {
      const body = {
        title: "My Post",
        tags: {
          create: [{ name: "JavaScript" }, { name: "TypeScript" }],
        },
      };

      const relationFields = {
        singular: [],
        list: [{ name: "tags", type: "Tag" }],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      // Should be unchanged
      expect(result).toEqual({
        title: "My Post",
        tags: {
          create: [{ name: "JavaScript" }, { name: "TypeScript" }],
        },
      });
    });

    it("should preserve pre-formatted set operation", () => {
      const body = {
        title: "My Post",
        tags: {
          set: [{ id: "1" }, { id: "2" }],
        },
      };

      const relationFields = {
        singular: [],
        list: [{ name: "tags", type: "Tag" }],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      // Should be unchanged
      expect(result).toEqual({
        title: "My Post",
        tags: {
          set: [{ id: "1" }, { id: "2" }],
        },
      });
    });

    it("should preserve complex pre-formatted operations", () => {
      const body = {
        title: "My Post",
        tags: {
          create: [{ name: "New Tag" }],
          connect: [{ id: "1" }],
          set: [{ id: "5" }, { id: "6" }],
        },
      };

      const relationFields = {
        singular: [],
        list: [{ name: "tags", type: "Tag" }],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      // Should be unchanged
      expect(result).toEqual({
        title: "My Post",
        tags: {
          create: [{ name: "New Tag" }],
          connect: [{ id: "1" }],
          set: [{ id: "5" }, { id: "6" }],
        },
      });
    });
  });

  describe("Mixed Auto and Pre-formatted Relations", () => {
    it("should handle mix of auto and pre-formatted relations", () => {
      const body = {
        title: "My Post",
        // This will be auto-handled
        category: {
          name: "Technology",
        },
        // This is pre-formatted and should be preserved
        tags: {
          connect: [{ id: "1" }],
          create: [{ name: "New Tag" }],
        },
        // This will be auto-handled
        comments: [
          { content: "Great post!", author: { email: "user@example.com" } },
        ],
      };

      const relationFields = {
        singular: [{ name: "category", type: "Category" }],
        list: [
          { name: "tags", type: "Tag" },
          { name: "comments", type: "Comment" },
        ],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      expect(result).toEqual({
        title: "My Post",
        category: {
          connect: {
            name: "Technology",
          },
        },
        // Preserved as-is
        tags: {
          connect: [{ id: "1" }],
          create: [{ name: "New Tag" }],
        },
        // Auto processed
        comments: {
          create: [
            {
              content: "Great post!",
              author: {
                connect: {
                  email: "user@example.com",
                },
              },
            },
          ],
        },
      });
    });

    it("should process nested relations but preserve pre-formatted ones", () => {
      const body = {
        name: "John Doe",
        posts: [
          {
            title: "My First Post",
            // This is pre-formatted and should be preserved
            category: {
              connect: { name: "Preformatted Category" },
            },
            // This will be auto-handled
            comments: [{ content: "Great post!" }],
          },
        ],
      };

      const relationFields = {
        singular: [],
        list: [{ name: "posts", type: "Post" }],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      expect(result).toEqual({
        name: "John Doe",
        posts: {
          create: [
            {
              title: "My First Post",
              // Preserved
              category: {
                connect: { name: "Preformatted Category" },
              },
              // Auto-processed
              comments: {
                create: [{ content: "Great post!" }],
              },
            },
          ],
        },
      });
    });
  });

  describe("removeApiAction", () => {
    it("Should strip out all apiAction fields", () => {
      const obj = {
        name: "Uanela Como",
        profile: {
          nickmake: "uanela",
          bio: "The best",
          games: {
            id: "123",
            apiAction: "connect",
          },
          apiAction: "create",
        },
      };

      const result = removeApiAction(obj);

      expect(result).toEqual({
        name: "Uanela Como",
        profile: {
          nickmake: "uanela",
          bio: "The best",
          games: {
            id: "123",
          },
        },
      });
    });
  });
});
