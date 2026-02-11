# ECR Retag Action

Retag an image in Amazon Elastic Container Registry (ECR).

This action allows you to take an existing image in an ECR repository and push it with a new tag, effectively "retagging" it without pulling and pushing the image layers manually. This is efficient for promotion workflows (e.g., tagging a `sha-123` image as `v1.0.0`).

## Inputs

| Input        | Description                                                                         | Required |
| ------------ | ----------------------------------------------------------------------------------- | -------- |
| `repository` | The name of the ECR repository.                                                     | **Yes**  |
| `tag`        | The existing tag of the image you want to retag. Example: `1.2.3` or `sha-abcdef1`. | **Yes**  |
| `newTag`     | The new tag to apply to the image. Example: `release-candidate`.                    | **Yes**  |

## Usage

Here is an example workflow that uses this action to retag an image.

```yaml
name: Retag Image

on:
  push:
    tags:
      - "v*"

jobs:
  retag:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/my-github-actions-role
          aws-region: us-east-1

      - name: Retag Docker Image
        uses: carepay/ecr-retag-action@v1
        with:
          repository: my-app-repo
          tag: ${{ github.sha }}
          newTag: ${{ github.ref_name }}
```

## Prerequisites

- **AWS Credentials**: This action requires valid AWS credentials to be available in the environment. We recommend using `aws-actions/configure-aws-credentials` to set up OIDC authentication or access keys.
- **Permissions**: The IAM role or user must have permissions to:
  - `ecr:BatchGetImage`
  - `ecr:PutImage`
    on the target repository.

## Development

To build the action locally:

```bash
npm install
npm run package
```

To update the `v1` tag to point to the latest commit:

```bash
git tag -f v1
git push origin v1 -f
```
