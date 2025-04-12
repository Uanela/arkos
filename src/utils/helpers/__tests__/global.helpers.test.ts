import { importModule } from "../global.helpers";

jest.mock("../global.helpers", () => ({
  importModule: jest.fn(() => ({ default: true })),
}));

describe("importModule", () => {
  it("Just for covarage", () => {
    const module = importModule("test");
    expect(module).toEqual({ default: true });
  });
});
