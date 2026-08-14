import * as core from "@actions/core";

const mockSend = jest.fn();

jest.mock("@aws-sdk/client-ecr", () => ({
  ECRClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
  BatchGetImageCommand: jest.fn().mockImplementation((input) => input),
  PutImageCommand: jest.fn().mockImplementation((input) => input),
}));

import { run } from "../src/main";

const INPUTS: Record<string, string> = {
  repository: "pricing",
  tag: "1.14.7",
  newTag: "ken-acc-1.14.7",
};

function ecrError(name: string): Error {
  const error = new Error(`${name} raised by ECR`);
  error.name = name;
  return error;
}

/** First send() is the BatchGetImage lookup; the second is the PutImage retag. */
function retagFailsWith(error: Error | null): void {
  mockSend
    .mockResolvedValueOnce({ images: [{ imageManifest: "{}" }] })
    .mockImplementationOnce(() => (error ? Promise.reject(error) : Promise.resolve({})));
}

describe("run", () => {
  let setFailed: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(core, "getInput").mockImplementation((name: string) => INPUTS[name] ?? "");
    jest.spyOn(core, "info").mockImplementation(() => {});
    setFailed = jest.spyOn(core, "setFailed").mockImplementation(() => {});
  });

  it("succeeds when the retag has already been applied", async () => {
    retagFailsWith(ecrError("ImageAlreadyExistsException"));

    await run();

    expect(setFailed).not.toHaveBeenCalled();
  });

  it("fails when the tag points at a different image", async () => {
    retagFailsWith(ecrError("ImageTagAlreadyExistsException"));

    await run();

    expect(setFailed).toHaveBeenCalledWith(
      expect.stringContaining("ImageTagAlreadyExistsException"),
    );
  });

  it("fails when the source tag is missing from ECR", async () => {
    mockSend.mockResolvedValueOnce({ images: [] });

    await run();

    expect(setFailed).toHaveBeenCalledWith(
      expect.stringContaining("Image with tag 1.14.7 not found"),
    );
  });

  it("tags the image when nothing is in the way", async () => {
    retagFailsWith(null);

    await run();

    expect(setFailed).not.toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalledTimes(2);
  });
});
