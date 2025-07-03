jest.mock("commander", () => {
  const mockCommand: any = {
    name: jest.fn().mockReturnThis(),
    description: jest.fn().mockReturnThis(),
    version: jest.fn().mockReturnThis(),
    command: jest.fn(() => mockCommand),
    option: jest.fn().mockReturnThis(),
    action: jest.fn().mockReturnThis(),
    parse: jest.fn().mockReturnThis(),
    alias: jest.fn().mockReturnThis(),
    requiredOption: jest.fn().mockReturnThis(),
  };
  return {
    Command: jest.fn().mockImplementation(() => mockCommand),
  };
});
