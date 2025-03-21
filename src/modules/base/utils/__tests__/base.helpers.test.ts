import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  handleRelationFieldsInBody,
  canBeUsedToConnect,
  isListFieldAnArray,
} from "../base.helpers"; // Update this path

// Mock the getPrismaModelRelations helper
vi.mock("../../../../utils/helpers/models.helpers", () => ({
  getPrismaModelRelations: vi.fn((type) => {
    if (type === "Post") {
      return {
        singular: [
          {
            name: "category",
            type: "Category",
            isUnique: false,
            uniqueFields: ["name"],
          },
        ],
        list: [
          {
            name: "tags",
            type: "Tag",
            isUnique: false,
            uniqueFields: ["name"],
          },
          { name: "comments", type: "Comment", isUnique: false },
        ],
      };
    }
    if (type === "User") {
      return {
        singular: [{ name: "profile", type: "Profile", isUnique: false }],
        list: [{ name: "posts", type: "Post", isUnique: false }],
      };
    }
    return null;
  }),
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
        singular: [{ name: "profile", type: "Profile", isUnique: false }],
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
        singular: [{ name: "profile", type: "Profile", isUnique: false }],
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
            isUnique: true,
            uniqueFields: ["name"],
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
        singular: [{ name: "profile", type: "Profile", isUnique: false }],
        list: [],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      expect(result).toEqual({
        name: "John Doe",
        profile: {
          update: {
            where: { id: "123" },
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
        singular: [{ name: "profile", type: "Profile", isUnique: false }],
        list: [],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      expect(result).toEqual({
        name: "John Doe",
        profile: {
          connect: {
            id: "123",
            apiAction: "connect",
          },
        },
      });
    });
  });

  describe("List Relations", () => {
    it("should handle create operation for list relation items without ids", () => {
      const body = {
        title: "My Post",
        tags: [{ name: "JavaScript" }, { name: "TypeScript" }],
      };

      const relationFields = {
        singular: [],
        list: [{ name: "tags", type: "Tag", isUnique: false }],
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
        list: [{ name: "tags", type: "Tag", isUnique: false }],
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
        list: [
          { name: "tags", type: "Tag", isUnique: true, uniqueFields: ["name"] },
        ],
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
        list: [{ name: "tags", type: "Tag", isUnique: false }],
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
        list: [{ name: "tags", type: "Tag", isUnique: false }],
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
        list: [{ name: "tags", type: "Tag", isUnique: false }],
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
          { name: "New Tag" }, // create
          { id: "1" }, // connect
          { id: "2", name: "Updated Tag" }, // update
          { id: "3", apiAction: "delete" }, // delete
          { id: "4", apiAction: "disconnect" }, // disconnect
        ],
      };

      const relationFields = {
        singular: [],
        list: [{ name: "tags", type: "Tag", isUnique: false }],
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
        list: [{ name: "posts", type: "Post", isUnique: false }],
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
                author: { email: "user@example.com" },
              },
            ],
          },
        ],
      };

      const relationFields = {
        singular: [],
        list: [{ name: "posts", type: "Post", isUnique: false }],
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
  });

  describe("Edge Cases", () => {
    it("should ignore fields in ignoreActions list", () => {
      const body = {
        name: "John Doe",
        posts: [
          { id: "1", apiAction: "ignore" },
          { id: "2", title: "Valid Post" },
        ],
        profile: { id: "1", apiAction: "ignore" },
      };

      const relationFields = {
        singular: [{ name: "profile", type: "Profile", isUnique: false }],
        list: [{ name: "posts", type: "Post", isUnique: false }],
      };

      const result = handleRelationFieldsInBody(body, relationFields, [
        "ignore",
      ]);

      expect(result).toEqual({
        name: "John Doe",
        posts: {
          update: [{ where: { id: "2" }, data: { title: "Valid Post" } }],
        },
      });
    });

    it("should handle empty arrays for list relation fields", () => {
      const body = {
        name: "John Doe",
        posts: [],
      };

      const relationFields = {
        singular: [],
        list: [{ name: "posts", type: "Post", isUnique: false }],
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
        singular: [{ name: "profile", type: "Profile", isUnique: false }],
        list: [{ name: "posts", type: "Post", isUnique: false }],
      };

      const result = handleRelationFieldsInBody(body, relationFields);

      expect(result).toEqual({
        name: "John Doe",
        profile: null,
        posts: null,
      });
    });
  });
});

describe("canBeUsedToConnect", () => {
  it("should return true for objects with only an id", () => {
    const field = { name: "user", type: "User", isUnique: false };
    const bodyField = { id: "123" };

    expect(canBeUsedToConnect(field, bodyField)).toBe(true);
  });

  it("should return true for objects with a single field when the relation is unique", () => {
    const field = { name: "user", type: "User", isUnique: true };
    const bodyField = { email: "test@example.com" };

    expect(canBeUsedToConnect(field, bodyField)).toBe(true);
  });

  it("should return true for objects with a single field from uniqueFields list", () => {
    const field = {
      name: "user",
      type: "User",
      isUnique: false,
      uniqueFields: ["email", "username"],
    };
    const bodyField = { email: "test@example.com" };

    expect(canBeUsedToConnect(field, bodyField)).toBe(true);
  });

  it("should return true for objects with apiAction set to connect", () => {
    const field = { name: "user", type: "User", isUnique: false };
    const bodyField = { id: "123", apiAction: "connect" };

    expect(canBeUsedToConnect(field, bodyField)).toBe(true);
  });

  it("should return false for objects with multiple fields", () => {
    const field = { name: "user", type: "User", isUnique: false };
    const bodyField = { id: "123", name: "John" };

    expect(canBeUsedToConnect(field, bodyField)).toBe(false);
  });

  it("should return false for objects with apiAction set to something other than connect", () => {
    const field = { name: "user", type: "User", isUnique: false };
    const bodyField = { id: "123", apiAction: "delete" };

    expect(canBeUsedToConnect(field, bodyField)).toBe(false);
  });

  it("should return false for null or undefined values", () => {
    const field = { name: "user", type: "User", isUnique: false };

    expect(canBeUsedToConnect(field, null)).toBe(false);
    expect(canBeUsedToConnect(field, undefined)).toBe(false);
  });
});

describe("isListFieldAnArray", () => {
  it("should return true for arrays", () => {
    expect(isListFieldAnArray([])).toBe(true);
    expect(isListFieldAnArray([1, 2, 3])).toBe(true);
    expect(isListFieldAnArray(new Array())).toBe(true);
  });

  it("should return false for non-arrays", () => {
    expect(isListFieldAnArray({})).toBe(false);
    expect(isListFieldAnArray("array")).toBe(false);
    expect(isListFieldAnArray(123)).toBe(false);
    expect(isListFieldAnArray(null)).toBe(false);
    expect(isListFieldAnArray(undefined)).toBe(false);
  });
});
