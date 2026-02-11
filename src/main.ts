import { Buffer } from "buffer";
import * as core from "@actions/core";
import {
  ECRClient,
  BatchGetImageCommand,
  PutImageCommand,
} from "@aws-sdk/client-ecr";

export async function run(): Promise<void> {
  try {
    core.info(`Starting ECR retag actioon`);
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

    await ecr.send(putCommand);
    core.info(
      `Successfully tagged image ${tag} with ${newTag} in repository ${repository}`,
    );
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Failed to tag ECR image: ${error.message}`);
    } else {
      core.setFailed("Unknown error during ECR tagging");
    }
  }
}
