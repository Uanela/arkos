import { importModule } from "../global.helpers";

describe("importModule", () => {
  it("Just for covarage", async () => {
    const module = await importModule("fs");
    expect(module).toBeDefined();
  });
});
