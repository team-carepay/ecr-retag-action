import { isImageAlreadyExists } from "../src/main";

/** ECR errors carry their type in `name`, so that is what the retag guard reads. */
function ecrError(name: string): Error {
  const error = new Error(`${name} raised by ECR`);
  error.name = name;
  return error;
}

describe("isImageAlreadyExists", () => {
  it("treats a re-tag of the same manifest as already done", () => {
    expect(isImageAlreadyExists(ecrError("ImageAlreadyExistsException"))).toBe(
      true,
    );
  });

  it("does not swallow a tag pointing at a different image", () => {
    expect(
      isImageAlreadyExists(ecrError("ImageTagAlreadyExistsException")),
    ).toBe(false);
  });

  it("does not swallow unrelated failures", () => {
    expect(isImageAlreadyExists(ecrError("RepositoryNotFoundException"))).toBe(
      false,
    );
    expect(isImageAlreadyExists("not an error")).toBe(false);
  });
});
