import { Buffer } from "buffer";
import * as core from "@actions/core";
import {
  ECRClient,
  BatchGetImageCommand,
  PutImageCommand,
} from "@aws-sdk/client-ecr";

// Same manifest, same tag: ECR reports it as an error, but nothing needs doing.
// A tag that exists on a DIFFERENT image raises ImageTagAlreadyExistsException instead
// (immutable repositories) and must keep failing — that is a genuine conflict.
export function isImageAlreadyExists(error: unknown): boolean {
  return error instanceof Error && error.name === "ImageAlreadyExistsException";
}

export async function run(): Promise<void> {
  try {
    core.info(`Starting ECR retag action`);
    const repository: string = core.getInput("repository");
    const tag: string = core.getInput("tag");
    const newTag: string = core.getInput("newTag");

    const ecr = new ECRClient();
    const getCommand = new BatchGetImageCommand({
      repositoryName: repository,
      imageIds: [{ imageTag: tag }],
    });
    const getResponse = await ecr.send(getCommand);

    if (
      !getResponse.images ||
      getResponse.images.length === 0 ||
      !getResponse.images[0].imageManifest
    ) {
      throw new Error(
        `Image with tag ${tag} not found in repository ${repository}`,
      );
    }
    core.info(`Successfully fetched image from ECR`);

    const putCommand = new PutImageCommand({
      repositoryName: repository,
      imageManifest: getResponse.images[0].imageManifest,
      imageTag: newTag,
    });

    try {
      await ecr.send(putCommand);
      core.info(
        `Successfully tagged image ${tag} with ${newTag} in repository ${repository}`,
      );
    } catch (error) {
      // ECR raises ImageAlreadyExistsException when this exact manifest already carries
      // newTag, i.e. the retag we are about to make has already been made. Re-running a
      // deploy is then a no-op, not a failure — failing here would leave the caller unable
      // to retry the steps that come after the retag.
      if (isImageAlreadyExists(error)) {
        core.info(
          `Image ${tag} already tagged ${newTag} in repository ${repository}, nothing to do`,
        );
      } else {
        throw error;
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Failed to tag ECR image: ${error.message}`);
    } else {
      core.setFailed("Unknown error during ECR tagging");
    }
  }
}
