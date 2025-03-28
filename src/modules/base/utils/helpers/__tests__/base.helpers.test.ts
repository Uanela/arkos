// import { describe, it, expect, vi, beforeEach } from "vitest";
// import {
//   handleRelationFieldsInBody,
//   canBeUsedToConnect,
//   isListFieldAnArray,
// } from "../base.helpers"; // Update this path

// // Mock the required helpers
// vi.mock("../../../../../utils/helpers/models.helpers", () => ({
//   getPrismaModelRelations: vi.fn((type) => {
//     if (type === "Post") {
//       return {
//         singular: [{ name: "category", type: "Category" }],
//         list: [
//           { name: "tags", type: "Tag" },
//           { name: "comments", type: "Comment" },
//         ],
//       };
//     }
//     if (type === "User") {
//       return {
//         singular: [{ name: "profile", type: "Profile" }],
//         list: [{ name: "posts", type: "Post" }],
//       };
//     }
//     if (type === "Comment") {
//       return {
//         singular: [{ name: "author", type: "User" }],
//       };
//     }
//     return null;
//   }),
//   getModelUniqueFields: vi.fn((modelName) => {
//     if (modelName === "Category") {
//       return [{ name: "name" }];
//     }
//     if (modelName === "Tag") {
//       return [{ name: "name" }];
//     }
//     if (modelName === "User") {
//       return [{ name: "email" }, { name: "username" }];
//     }
//     return [];
//   }),
//   RelationField: {}, // Add this to satisfy TypeScript if needed
//   RelationFields: {}, // Add this to satisfy TypeScript if needed
// }));

// describe("handleRelationFieldsInBody", () => {
//   describe("Singular Relations", () => {
//     it("should handle create operation for singular relation without id", () => {
//       const body = {
//         name: "John Doe",
//         profile: {
//           bio: "Software Engineer",
//           avatarUrl: "https://example.com/avatar.jpg",
//         },
//       };

//       const relationFields = {
//         singular: [{ name: "profile", type: "Profile" }],
//         list: [],
//       };

//       const result = handleRelationFieldsInBody(body, relationFields);

//       expect(result).toEqual({
//         name: "John Doe",
//         profile: {
//           create: {
//             bio: "Software Engineer",
//             avatarUrl: "https://example.com/avatar.jpg",
//           },
//         },
//       });
//     });

//     it("should handle connect operation for singular relation with only id", () => {
//       const body = {
//         name: "John Doe",
//         profile: {
//           id: "123",
//         },
//       };

//       const relationFields = {
//         singular: [{ name: "profile", type: "Profile" }],
//         list: [],
//       };

//       const result = handleRelationFieldsInBody(body, relationFields);

//       expect(result).toEqual({
//         name: "John Doe",
//         profile: {
//           connect: {
//             id: "123",
//           },
//         },
//       });
//     });

//     it("should handle connect operation for singular relation with unique field", () => {
//       const body = {
//         name: "John Doe",
//         category: {
//           name: "Technology",
//         },
//       };

//       const relationFields = {
//         singular: [
//           {
//             name: "category",
//             type: "Category",
//           },
//         ],
//         list: [],
//       };

//       const result = handleRelationFieldsInBody(body, relationFields);

//       expect(result).toEqual({
//         name: "John Doe",
//         category: {
//           connect: {
//             name: "Technology",
//           },
//         },
//       });
//     });

//     it("should handle update operation for singular relation with id and other fields", () => {
//       const body = {
//         name: "John Doe",
//         profile: {
//           id: "123",
//           bio: "Updated Bio",
//           avatarUrl: "https://example.com/new-avatar.jpg",
//         },
//       };

//       const relationFields = {
//         singular: [{ name: "profile", type: "Profile" }],
//         list: [],
//       };

//       const result = handleRelationFieldsInBody(body, relationFields);

//       expect(result).toEqual({
//         name: "John Doe",
//         profile: {
//           update: {
//             data: {
//               bio: "Updated Bio",
//               avatarUrl: "https://example.com/new-avatar.jpg",
//             },
//           },
//         },
//       });
//     });

//     it("should handle explicit connect operation with apiAction", () => {
//       const body = {
//         name: "John Doe",
//         profile: {
//           id: "123",
//           apiAction: "connect",
//         },
//       };

//       const relationFields = {
//         singular: [{ name: "profile", type: "Profile" }],
//         list: [],
//       };

//       const result = handleRelationFieldsInBody(body, relationFields);

//       expect(result).toEqual({
//         name: "John Doe",
//         profile: {
//           connect: {
//             id: "123",
//           },
//         },
//       });
//     });
//   });

//   describe("List Relations", () => {
//     it("should handle create operation for list relation items without ids", () => {
//       const body = {
//         title: "My Post",
//         tags: [
//           { name: "JavaScript", apiAction: "create" },
//           { name: "TypeScript", apiAction: "create" },
//         ],
//       };

//       const relationFields = {
//         singular: [],
//         list: [{ name: "tags", type: "Tag" }],
//       };

//       const result = handleRelationFieldsInBody(body, relationFields);

//       expect(result).toEqual({
//         title: "My Post",
//         tags: {
//           create: [{ name: "JavaScript" }, { name: "TypeScript" }],
//         },
//       });
//     });

//     it("should handle connect operation for list relation items with only ids", () => {
//       const body = {
//         title: "My Post",
//         tags: [{ id: "1" }, { id: "2" }],
//       };

//       const relationFields = {
//         singular: [],
//         list: [{ name: "tags", type: "Tag" }],
//       };

//       const result = handleRelationFieldsInBody(body, relationFields);

//       expect(result).toEqual({
//         title: "My Post",
//         tags: {
//           connect: [{ id: "1" }, { id: "2" }],
//         },
//       });
//     });

//     it("should handle connect operation for list relation items with unique fields", () => {
//       const body = {
//         title: "My Post",
//         tags: [{ name: "JavaScript" }, { name: "TypeScript" }],
//       };

//       const relationFields = {
//         singular: [],
//         list: [{ name: "tags", type: "Tag" }],
//       };

//       const result = handleRelationFieldsInBody(body, relationFields);

//       expect(result).toEqual({
//         title: "My Post",
//         tags: {
//           connect: [{ name: "JavaScript" }, { name: "TypeScript" }],
//         },
//       });
//     });

//     it("should handle update operation for list relation items with ids and other fields", () => {
//       const body = {
//         title: "My Post",
//         tags: [
//           { id: "1", name: "Updated JavaScript" },
//           { id: "2", name: "Updated TypeScript" },
//         ],
//       };

//       const relationFields = {
//         singular: [],
//         list: [{ name: "tags", type: "Tag" }],
//       };

//       const result = handleRelationFieldsInBody(body, relationFields);

//       expect(result).toEqual({
//         title: "My Post",
//         tags: {
//           update: [
//             { where: { id: "1" }, data: { name: "Updated JavaScript" } },
//             { where: { id: "2" }, data: { name: "Updated TypeScript" } },
//           ],
//         },
//       });
//     });

//     it('should handle deleteMany operation for list relation items with apiAction: "delete"', () => {
//       const body = {
//         title: "My Post",
//         tags: [
//           { id: "1", apiAction: "delete" },
//           { id: "2", apiAction: "delete" },
//         ],
//       };

//       const relationFields = {
//         singular: [],
//         list: [{ name: "tags", type: "Tag" }],
//       };

//       const result = handleRelationFieldsInBody(body, relationFields);

//       expect(result).toEqual({
//         title: "My Post",
//         tags: {
//           deleteMany: {
//             id: { in: ["1", "2"] },
//           },
//         },
//       });
//     });

//     it('should handle disconnect operation for list relation items with apiAction: "disconnect"', () => {
//       const body = {
//         title: "My Post",
//         tags: [
//           { id: "1", apiAction: "disconnect" },
//           { id: "2", apiAction: "disconnect" },
//         ],
//       };

//       const relationFields = {
//         singular: [],
//         list: [{ name: "tags", type: "Tag" }],
//       };

//       const result = handleRelationFieldsInBody(body, relationFields);

//       expect(result).toEqual({
//         title: "My Post",
//         tags: {
//           disconnect: [{ id: "1" }, { id: "2" }],
//         },
//       });
//     });

//     it("should handle mixed operations for list relation items", () => {
//       const body = {
//         title: "My Post",
//         tags: [
//           { name: "New Tag", apiAction: "create" }, // create
//           { id: "1" }, // connect
//           { id: "2", name: "Updated Tag" }, // update
//           { id: "3", apiAction: "delete" }, // delete
//           { id: "4", apiAction: "disconnect" }, // disconnect
//         ],
//       };

//       const relationFields = {
//         singular: [],
//         list: [{ name: "tags", type: "Tag" }],
//       };

//       const result = handleRelationFieldsInBody(body, relationFields);

//       expect(result).toEqual({
//         title: "My Post",
//         tags: {
//           create: [{ name: "New Tag" }],
//           connect: [{ id: "1" }],
//           update: [{ where: { id: "2" }, data: { name: "Updated Tag" } }],
//           disconnect: [{ id: "4" }],
//           deleteMany: { id: { in: ["3"] } },
//         },
//       });
//     });
//   });

//   describe("Nested Relations", () => {
//     it("should handle nested relations recursively", () => {
//       const body = {
//         name: "John Doe",
//         posts: [
//           {
//             title: "My First Post",
//             category: { name: "Technology" },
//             tags: [{ name: "JavaScript" }],
//           },
//         ],
//       };

//       const relationFields = {
//         singular: [],
//         list: [{ name: "posts", type: "Post" }],
//       };

//       const result = handleRelationFieldsInBody(body, relationFields);

//       expect(result).toEqual({
//         name: "John Doe",
//         posts: {
//           create: [
//             {
//               title: "My First Post",
//               category: {
//                 connect: { name: "Technology" },
//               },
//               tags: {
//                 connect: [{ name: "JavaScript" }],
//               },
//             },
//           ],
//         },
//       });
//     });

//     it("should handle deep nested relations", () => {
//       const body = {
//         name: "John Doe",
//         posts: [
//           {
//             title: "My First Post",
//             comments: [
//               {
//                 content: "Great post!",
//                 author: { email: "user@example.com", apiAction: "create" },
//               },
//             ],
//           },
//         ],
//       };

//       const relationFields = {
//         singular: [],
//         list: [{ name: "posts", type: "Post" }],
//       };

//       const result = handleRelationFieldsInBody(body, relationFields);

//       expect(result).toEqual({
//         name: "John Doe",
//         posts: {
//           create: [
//             {
//               title: "My First Post",
//               comments: {
//                 create: [
//                   {
//                     content: "Great post!",
//                     author: { create: { email: "user@example.com" } },
//                   },
//                 ],
//               },
//             },
//           ],
//         },
//       });
//     });
//   });

//   describe("Edge Cases", () => {
//     it("should handle empty arrays for list relation fields", () => {
//       const body = {
//         name: "John Doe",
//         posts: [],
//       };

//       const relationFields = {
//         singular: [],
//         list: [{ name: "posts", type: "Post" }],
//       };

//       const result = handleRelationFieldsInBody(body, relationFields);

//       expect(result).toEqual({
//         name: "John Doe",
//         posts: {},
//       });
//     });

//     it("should handle null values for relation fields", () => {
//       const body = {
//         name: "John Doe",
//         profile: null,
//         posts: null,
//       };

//       const relationFields = {
//         singular: [{ name: "profile", type: "Profile" }],
//         list: [{ name: "posts", type: "Post" }],
//       };

//       const result = handleRelationFieldsInBody(body, relationFields);

//       expect(result).toEqual({
//         name: "John Doe",
//         profile: null,
//         posts: null,
//       });
//     });
//   });
// });

// describe("canBeUsedToConnect", () => {
//   it("should return true for objects with only an id", () => {
//     const modelName = "User";
//     const bodyField = { id: "123" };

//     expect(canBeUsedToConnect(modelName, bodyField)).toBe(true);
//   });

//   it("should return true for objects with a single unique field", () => {
//     const modelName = "User";
//     const bodyField = { email: "test@example.com" };

//     expect(canBeUsedToConnect(modelName, bodyField)).toBe(true);
//   });

//   it("should return true for objects with a single field from uniqueFields list", () => {
//     const modelName = "User";
//     const bodyField = { username: "testuser" };

//     expect(canBeUsedToConnect(modelName, bodyField)).toBe(true);
//   });

//   it("should return true for objects with apiAction set to connect", () => {
//     const modelName = "User";
//     const bodyField = { id: "123", apiAction: "connect" };

//     expect(canBeUsedToConnect(modelName, bodyField)).toBe(true);
//   });

//   it("should return false for objects with multiple fields", () => {
//     const modelName = "User";
//     const bodyField = { id: "123", name: "John" };

//     expect(canBeUsedToConnect(modelName, bodyField)).toBe(false);
//   });

//   it("should return false for objects with a single field that is not unique", () => {
//     const modelName = "User";
//     const bodyField = { name: "John" }; // assuming name is not a unique field

//     expect(canBeUsedToConnect(modelName, bodyField)).toBe(false);
//   });

//   it("should return false for objects with apiAction set to something other than connect", () => {
//     const modelName = "User";
//     const bodyField = { id: "123", apiAction: "delete" };

//     expect(canBeUsedToConnect(modelName, bodyField)).toBe(false);
//   });

//   it("should return false for null or undefined values", () => {
//     const modelName = "User";

//     expect(canBeUsedToConnect(modelName, null)).toBe(false);
//     expect(canBeUsedToConnect(modelName, undefined)).toBe(false);
//   });
// });

// describe("isListFieldAnArray", () => {
//   it("should return true for arrays", () => {
//     expect(isListFieldAnArray([])).toBe(true);
//     expect(isListFieldAnArray([1, 2, 3])).toBe(true);
//     expect(isListFieldAnArray(new Array())).toBe(true);
//   });

//   it("should return false for non-arrays", () => {
//     expect(isListFieldAnArray({})).toBe(false);
//     expect(isListFieldAnArray("array")).toBe(false);
//     expect(isListFieldAnArray(123)).toBe(false);
//     expect(isListFieldAnArray(null)).toBe(false);
//     expect(isListFieldAnArray(undefined)).toBe(false);
//   });
// });
